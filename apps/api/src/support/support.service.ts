import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AddSupportCommentInput,
  CreateSupportTicketInput,
  SupportTicketStatus,
  UpdateSupportTicketInput,
} from "@skolara/types";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

const TICKET_INCLUDE = {
  school: { select: { id: true, name: true, subdomain: true, plan: true } },
  raisedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const;

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(
    schoolId: string,
    raisedByUserId: string,
    input: CreateSupportTicketInput,
  ) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        schoolId,
        raisedByUserId,
        subject: input.subject,
        body: input.body,
        priority: input.priority,
      },
      include: TICKET_INCLUDE,
    });

    await this.notifyPlatform(ticket.school.name, input.subject, input.priority, ticket.id);
    return ticket;
  }

  /**
   * Super admins see every school's tickets; a school admin sees only their
   * own. The scoping is applied here rather than left to the caller so a new
   * endpoint can't accidentally leak another tenant's support history.
   */
  findVisibleFor(user: AuthenticatedUser, status?: SupportTicketStatus) {
    const scope =
      user.role === "SUPER_ADMIN" ? {} : { schoolId: user.schoolId ?? "__none__" };

    return this.prisma.supportTicket.findMany({
      where: { ...scope, ...(status ? { status } : {}) },
      // Urgent first, then longest-waiting: this is a queue someone works down.
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: TICKET_INCLUDE,
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        id,
        ...(user.role === "SUPER_ADMIN" ? {} : { schoolId: user.schoolId ?? "__none__" }),
      },
      include: TICKET_INCLUDE,
    });
    if (!ticket) throw new NotFoundException("Ticket not found");

    const comments = await this.prisma.supportTicketComment.findMany({
      where: {
        ticketId: id,
        // Internal notes are filtered in the query, not after fetching, so
        // they can't reach a school through a serialisation slip.
        ...(user.role === "SUPER_ADMIN" ? {} : { internal: false }),
      },
      orderBy: { createdAt: "asc" },
      include: {
        authorUser: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    return { ...ticket, comments };
  }

  async addComment(user: AuthenticatedUser, id: string, input: AddSupportCommentInput) {
    const ticket = await this.assertVisible(user, id);

    // A school can't leave a note hidden from itself — honouring the flag
    // would let it write a comment nobody ever reads.
    const internal = user.role === "SUPER_ADMIN" ? input.internal : false;

    const comment = await this.prisma.supportTicketComment.create({
      data: { ticketId: id, authorUserId: user.id, body: input.body, internal },
    });

    // An internal note is nobody else's business, so it notifies nobody.
    if (!internal) {
      if (user.role === "SUPER_ADMIN") {
        await this.notifications.sendPush([ticket.raisedByUserId], {
          title: "Support reply",
          body: input.body.slice(0, 140),
          data: { type: "SUPPORT_TICKET", ticketId: id },
        });
      } else {
        await this.notifyPlatform(
          ticket.school.name,
          `Reply on: ${ticket.subject}`,
          ticket.priority,
          id,
        );
      }
    }

    return comment;
  }

  async update(id: string, input: UpdateSupportTicketInput) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException("Ticket not found");

    const resolving = input.status === "RESOLVED" || input.status === "CLOSED";
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        // Stamped on the way in, cleared if a ticket is reopened, so the
        // timestamp never describes a state the ticket isn't in.
        ...(input.status ? { resolvedAt: resolving ? new Date() : null } : {}),
      },
    });

    if (input.status) {
      await this.notifications.sendPush([ticket.raisedByUserId], {
        title: "Support ticket updated",
        body: `"${ticket.subject}" is now ${input.status.replace(/_/g, " ").toLowerCase()}.`,
        data: { type: "SUPPORT_TICKET", ticketId: id },
      });
    }

    return updated;
  }

  private async assertVisible(user: AuthenticatedUser, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        id,
        ...(user.role === "SUPER_ADMIN" ? {} : { schoolId: user.schoolId ?? "__none__" }),
      },
      include: TICKET_INCLUDE,
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    if (ticket.status === "CLOSED") {
      throw new ForbiddenException("That ticket is closed — raise a new one");
    }
    return ticket;
  }

  private async notifyPlatform(
    schoolName: string,
    subject: string,
    priority: string,
    ticketId: string,
  ) {
    // Platform staff have no schoolId, which is what distinguishes them.
    const platformStaff = await this.prisma.user.findMany({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { id: true },
    });

    await this.notifications.sendPush(
      platformStaff.map((staff) => staff.id),
      {
        title: `${priority} support ticket`,
        body: `${schoolName}: ${subject}`,
        data: { type: "SUPPORT_TICKET", ticketId },
      },
    );
  }
}
