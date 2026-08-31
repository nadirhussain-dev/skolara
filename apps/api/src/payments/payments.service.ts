import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { formatPaymentReference } from "@skolara/utils";
import type {
  PaymentSubmissionStatus,
  ReviewPaymentInput,
  SubmitPaymentInput,
} from "@skolara/types";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
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
        this.notifications.sendWhatsApp(parentPhone, body),
        this.notifications.sendPush([submission.submittedByUser.id], {
          title: `Payment ${submission.referenceId}`,
          body,
          data: { type: "PAYMENT", submissionId: submission.id },
        }),
      ]);
    };

    if (input.status === "VERIFIED") {
      const updated = await this.prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.findUniqueOrThrow({
          where: { id: submission.invoiceId },
        });
        const amountPaid =
          Number(invoice.amountPaid) + Number(submission.amountClaimed);
        const status =
          amountPaid >= Number(invoice.amountDue) ? "PAID" : "PARTIALLY_PAID";

        await tx.invoice.update({
          where: { id: invoice.id },
          data: { amountPaid, status },
        });

        return tx.paymentSubmission.update({
          where: { id },
          data: {
            status: "VERIFIED",
            reviewedByUserId,
            reviewedAt: new Date(),
          },
        });
      });

      await notify(`Payment ${submission.referenceId} has been verified. Thank you!`);
      return updated;
    }

    if (input.status === "REJECTED") {
      const updated = await this.prisma.paymentSubmission.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: input.rejectionReason,
          reviewNote: input.reviewNote ?? null,
          reviewedByUserId,
          reviewedAt: new Date(),
        },
      });

      await notify(
        `Payment ${submission.referenceId} was rejected (${input.rejectionReason}). Please resubmit.`,
      );
      return updated;
    }

    const updated = await this.prisma.paymentSubmission.update({
      where: { id },
      data: {
        status: "NEEDS_INFO",
        reviewNote: input.reviewNote,
        reviewedByUserId,
        reviewedAt: new Date(),
      },
    });

    await notify(`Payment ${submission.referenceId} needs more info: ${input.reviewNote}`);
    return updated;
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
