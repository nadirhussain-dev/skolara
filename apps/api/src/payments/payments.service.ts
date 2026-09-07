import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { formatPaymentReference } from "@skolara/utils";
import type {
  PaymentSubmissionStatus,
  ReviewPaymentInput,
  SubmitPaymentInput,
} from "@skolara/types";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { DocumentsService } from "../documents/documents.service";
import { NotificationsService } from "../notifications/notifications.service";
import { receiptDefinition } from "./receipt.template";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private documents: DocumentsService,
  ) {}

  async assertCanSubmitFor(user: AuthenticatedUser, studentId: string) {
    if (user.role === "STUDENT") {
      const owned = await this.prisma.studentProfile.findFirst({
        where: { id: studentId, userId: user.id },
      });
      if (!owned) throw new ForbiddenException("Not your record");
      return;
    }
    if (user.role === "PARENT") {
      const link = await this.prisma.parentStudentLink.findUnique({
        where: { parentUserId_studentId: { parentUserId: user.id, studentId } },
      });
      if (!link) throw new ForbiddenException("Not your child's record");
      return;
    }
    throw new ForbiddenException("Only parents or students can submit payments");
  }

  async submitPayment(
    schoolId: string,
    studentId: string,
    submittedByUserId: string,
    input: SubmitPaymentInput,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: input.invoiceId, schoolId, studentId },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    const referenceId = await this.nextReferenceId(schoolId);

    // Flag likely accidental double-submissions for the reviewer, without blocking the parent.
    const possibleDuplicate = await this.prisma.paymentSubmission.findFirst({
      where: {
        schoolId,
        invoiceId: input.invoiceId,
        studentId,
        amountClaimed: input.amountClaimed,
        status: "PENDING_VERIFICATION",
      },
    });

    return this.prisma.paymentSubmission.create({
      data: {
        referenceId,
        schoolId,
        studentId,
        invoiceId: input.invoiceId,
        submittedByUserId,
        amountClaimed: input.amountClaimed,
        screenshotUrl: input.screenshotUrl,
        status: "PENDING_VERIFICATION",
        reviewNote: possibleDuplicate
          ? `Possible duplicate of ${possibleDuplicate.referenceId} — same invoice and amount already pending.`
          : null,
      },
    });
  }

  listQueue(schoolId: string, status?: PaymentSubmissionStatus) {
    return this.prisma.paymentSubmission.findMany({
      where: { schoolId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "asc" },
      include: {
        student: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        invoice: true,
      },
    });
  }

  async review(
    schoolId: string,
    id: string,
    reviewedByUserId: string,
    input: ReviewPaymentInput,
  ) {
    const submission = await this.prisma.paymentSubmission.findFirst({
      where: { id, schoolId },
      include: { submittedByUser: { select: { id: true, phone: true } } },
    });
    if (!submission) throw new NotFoundException("Payment submission not found");
    if (submission.status === "VERIFIED") {
      throw new BadRequestException("Submission already verified");
    }
    const parentPhone = submission.submittedByUser.phone;
    const notify = async (body: string) => {
      await Promise.all([
        this.notifications.sendPhoneAlert(schoolId, parentPhone, body),
        this.notifications.sendPush([submission.submittedByUser.id], {
          title: `Payment ${submission.referenceId}`,
          body,
          data: { type: "PAYMENT", submissionId: submission.id },
        }),
      ]);
    };

    if (input.status === "VERIFIED") {
      const updated = await this.prisma.$transaction(async (tx) => {
        // Claim the submission before crediting anything. The status test lives
        // in the WHERE clause rather than in the `if` above because the read
        // above and this write are two round trips: at Postgres' default READ
        // COMMITTED isolation two admins clearing the same queue both read
        // PENDING_VERIFICATION, both pass that check, and both credit the
        // invoice for one transfer. Only the caller whose UPDATE matched a row
        // gets to go on.
        const claimed = await tx.paymentSubmission.updateMany({
          where: { id, schoolId, status: { not: "VERIFIED" } },
          data: { status: "VERIFIED", reviewedByUserId, reviewedAt: new Date() },
        });
        if (claimed.count === 0) {
          throw new BadRequestException("Submission already verified");
        }

        // One statement adds the money and settles the status from the result.
        //
        // Reading `amountPaid`, adding to it in JavaScript and writing the
        // total back loses money outright: two *different* submissions against
        // one invoice both read a balance of 0, one computes 3,000 and the
        // other 5,000, and whichever commits second overwrites the first — the
        // invoice shows one payment while both submissions read VERIFIED. That
        // is a parent who has paid and a school that has no record of it, so
        // the addition belongs to the database, which holds the row while it
        // does it.
        const credited = await tx.$executeRaw`
          UPDATE "Invoice"
          SET "amountPaid" = "amountPaid" + ${submission.amountClaimed.toString()}::numeric,
              "status" = CASE
                WHEN "amountPaid" + ${submission.amountClaimed.toString()}::numeric >= "amountDue"
                  THEN 'PAID'::"InvoiceStatus"
                ELSE 'PARTIALLY_PAID'::"InvoiceStatus"
              END
          WHERE "id" = ${submission.invoiceId}
            AND "schoolId" = ${schoolId}
        `;
        if (credited === 0) throw new NotFoundException("Invoice not found");

        return tx.paymentSubmission.findUniqueOrThrow({ where: { id } });
      });

      // After the transaction, not inside it: a PDF render and an upload have
      // no business holding a database transaction open, and a storage outage
      // must not roll back a payment the school has already confirmed.
      const receiptUrl = await this.renderReceipt(schoolId, submission.id, reviewedByUserId);

      await notify(`Payment ${submission.referenceId} has been verified. Thank you!`);
      return receiptUrl ? { ...updated, receiptUrl } : updated;
    }

    if (input.status === "REJECTED") {
      const updated = await this.claimForReview(schoolId, id, {
        status: "REJECTED",
        rejectionReason: input.rejectionReason,
        reviewNote: input.reviewNote ?? null,
        reviewedByUserId,
        reviewedAt: new Date(),
      });

      await notify(
        `Payment ${submission.referenceId} was rejected (${input.rejectionReason}). Please resubmit.`,
      );
      return updated;
    }

    const updated = await this.claimForReview(schoolId, id, {
      status: "NEEDS_INFO",
      reviewNote: input.reviewNote,
      reviewedByUserId,
      reviewedAt: new Date(),
    });

    await notify(`Payment ${submission.referenceId} needs more info: ${input.reviewNote}`);
    return updated;
  }

  /**
   * Stamps a review outcome onto a submission that hasn't been verified yet.
   *
   * Rejecting and asking for more information move no money, but they must
   * still lose to a concurrent verification rather than overwrite it: a
   * submission marked REJECTED whose invoice was already credited is a payment
   * the school has banked and disowned in the same breath.
   */
  private async claimForReview(
    schoolId: string,
    id: string,
    // The unchecked variant, because `reviewedByUserId` is a relation's
    // foreign key and the checked `UpdateMany` input omits those.
    data: Prisma.PaymentSubmissionUncheckedUpdateManyInput,
  ) {
    const claimed = await this.prisma.paymentSubmission.updateMany({
      where: { id, schoolId, status: { not: "VERIFIED" } },
      data,
    });
    if (claimed.count === 0) {
      throw new BadRequestException("Submission already verified");
    }
    return this.prisma.paymentSubmission.findUniqueOrThrow({ where: { id } });
  }

  /**
   * Renders the fee receipt for a verified submission and stores the URL.
   *
   * Best-effort by design: the payment is already verified and the invoice
   * already updated by the time this runs, so a failure here must not undo
   * that. The receipt can be regenerated; the payment can't be un-taken.
   */
  private async renderReceipt(
    schoolId: string,
    submissionId: string,
    reviewedByUserId: string,
  ): Promise<string | null> {
    try {
      const submission = await this.prisma.paymentSubmission.findUniqueOrThrow({
        where: { id: submissionId },
        include: {
          school: { select: { name: true, primaryColor: true } },
          invoice: true,
          student: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      });
      const reviewer = await this.prisma.user.findUnique({
        where: { id: reviewedByUserId },
        select: { firstName: true, lastName: true },
      });

      const file = await this.documents.renderAndStore(
        schoolId,
        receiptDefinition({
          school: submission.school,
          referenceId: submission.referenceId,
          studentName: `${submission.student.user.firstName} ${submission.student.user.lastName}`,
          admissionNumber: submission.student.admissionNumber,
          term: submission.invoice.term,
          amountPaid: Number(submission.amountClaimed),
          invoiceTotal: Number(submission.invoice.amountDue),
          paidToDate: Number(submission.invoice.amountPaid),
          verifiedOn: submission.reviewedAt ?? new Date(),
          verifiedBy: reviewer
            ? `${reviewer.firstName} ${reviewer.lastName}`
            : "the school office",
        }),
      );

      await this.prisma.paymentSubmission.update({
        where: { id: submissionId },
        data: { receiptUrl: file.url },
      });
      return file.url;
    } catch (error) {
      this.logger.warn(
        `Receipt generation failed for submission ${submissionId}: ${error}`,
      );
      return null;
    }
  }

  private async nextReferenceId(schoolId: string): Promise<string> {
    const year = new Date().getFullYear();
    const sequence = await this.prisma.paymentReferenceSequence.upsert({
      where: { schoolId_year: { schoolId, year } },
      create: { schoolId, year, lastSequence: 1 },
      update: { lastSequence: { increment: 1 } },
    });
    return formatPaymentReference(year, sequence.lastSequence);
  }
}
