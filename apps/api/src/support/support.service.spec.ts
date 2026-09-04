import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { SupportService } from "./support.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const TICKET = "ticket-1";

const schoolAdmin: AuthenticatedUser = { id: "admin-1", role: "SCHOOL_ADMIN", schoolId: SCHOOL };
const superAdmin: AuthenticatedUser = { id: "root-1", role: "SUPER_ADMIN", schoolId: null };

const ticketRow = {
  id: TICKET,
  schoolId: SCHOOL,
  raisedByUserId: "admin-1",
  subject: "Fees not syncing",
  priority: "HIGH",
  status: "OPEN",
  school: { id: SCHOOL, name: "Test School", subdomain: "test", plan: "STANDARD" },
  raisedByUser: { id: "admin-1", firstName: "Nadia", lastName: "Aslam", email: "n@test" },
};

describe("SupportService", () => {
  let prisma: {
    supportTicket: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    supportTicketComment: { create: jest.Mock; findMany: jest.Mock };
    user: { findMany: jest.Mock };
  };
  let notifications: { sendPush: jest.Mock };
  let service: SupportService;

  beforeEach(() => {
    prisma = {
      supportTicket: {
        create: jest.fn().mockResolvedValue(ticketRow),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(ticketRow),
        findUnique: jest.fn().mockResolvedValue(ticketRow),
        update: jest.fn().mockResolvedValue({ ...ticketRow, status: "RESOLVED" }),
      },
      supportTicketComment: {
        create: jest.fn().mockResolvedValue({ id: "comment-1" }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: "root-1" }]) },
    };
    notifications = { sendPush: jest.fn() };
    service = new SupportService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  describe("scoping", () => {
    it("shows a super admin every school's tickets", async () => {
      await service.findVisibleFor(superAdmin);
      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it("scopes a school admin to their own school", async () => {
      await service.findVisibleFor(schoolAdmin);
      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { schoolId: SCHOOL } }),
      );
    });

    it("matches nothing for a school admin with no school rather than everything", async () => {
      await service.findVisibleFor({ ...schoolAdmin, schoolId: null });
      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { schoolId: "__none__" } }),
      );
    });

    it("orders urgent first, then longest-waiting", async () => {
      await service.findVisibleFor(superAdmin);
      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        }),
      );
    });
  });

  describe("internal notes", () => {
    it("hides them from a school in the query, not after fetching", async () => {
      await service.findOne(schoolAdmin, TICKET);
      expect(prisma.supportTicketComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ticketId: TICKET, internal: false },
        }),
      );
    });

    it("shows them to platform staff", async () => {
      await service.findOne(superAdmin, TICKET);
      expect(prisma.supportTicketComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ticketId: TICKET } }),
      );
    });

    it("lets platform staff write one", async () => {
      await service.addComment(superAdmin, TICKET, { body: "Checked the logs", internal: true });
      expect(prisma.supportTicketComment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ internal: true }) }),
      );
    });

    it("ignores the flag from a school, so it can't hide a note from itself", async () => {
      await service.addComment(schoolAdmin, TICKET, { body: "Any update?", internal: true });
      expect(prisma.supportTicketComment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ internal: false }) }),
      );
    });

    it("notifies nobody for an internal note", async () => {
      await service.addComment(superAdmin, TICKET, { body: "Working note", internal: true });
      expect(notifications.sendPush).not.toHaveBeenCalled();
    });
  });

  describe("comments", () => {
    it("tells the school when platform staff reply", async () => {
      await service.addComment(superAdmin, TICKET, { body: "Fixed", internal: false });
      expect(notifications.sendPush).toHaveBeenCalledWith(
        ["admin-1"],
        expect.objectContaining({ title: "Support reply" }),
      );
    });

    it("tells platform staff when a school replies", async () => {
      await service.addComment(schoolAdmin, TICKET, { body: "Still broken", internal: false });
      expect(notifications.sendPush).toHaveBeenCalledWith(
        ["root-1"],
        expect.objectContaining({ body: expect.stringContaining("Fees not syncing") }),
      );
    });

    it("refuses a comment on a closed ticket", async () => {
      prisma.supportTicket.findFirst.mockResolvedValue({ ...ticketRow, status: "CLOSED" });
      await expect(
        service.addComment(schoolAdmin, TICKET, { body: "Hello?", internal: false }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("refuses a comment on another school's ticket", async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(null);
      await expect(
        service.addComment(schoolAdmin, TICKET, { body: "Hello?", internal: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("update", () => {
    it("stamps resolvedAt when resolving", async () => {
      await service.update(TICKET, { status: "RESOLVED" });
      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
        }),
      );
    });

    it("clears resolvedAt when reopening, so the stamp never describes a state it isn't in", async () => {
      await service.update(TICKET, { status: "IN_PROGRESS" });
      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resolvedAt: null }),
        }),
      );
    });

    it("leaves resolvedAt untouched when only the priority changes", async () => {
      await service.update(TICKET, { priority: "URGENT" });
      const data = prisma.supportTicket.update.mock.calls[0][0].data;
      expect(data).not.toHaveProperty("resolvedAt");
    });
  });
});
