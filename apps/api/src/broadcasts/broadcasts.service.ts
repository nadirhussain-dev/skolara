import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateBroadcastInput } from "@skolara/types";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BroadcastsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(publishedByUserId: string, input: CreateBroadcastInput) {
    const broadcast = await this.prisma.platformBroadcast.create({
      data: {
        title: input.title,
        body: input.body,
        audienceRoles: input.audienceRoles,
        publishedByUserId,
        expiresAt: input.expiresAt ?? null,
      },
    });

    await this.pushToAudience(input, broadcast.id);
    return broadcast;
  }

  /**
   * Broadcasts this user should currently see.
   *
   * An empty `audienceRoles` means everyone — represented as empty rather than
   * every role listed so a broadcast doesn't need rewriting when a new role is
   * added.
   */
  findActiveFor(user: AuthenticatedUser) {
    const now = new Date();
    return this.prisma.platformBroadcast.findMany({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        AND: [
          { OR: [{ audienceRoles: { isEmpty: true } }, { audienceRoles: { has: user.role } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findAll() {
    return this.prisma.platformBroadcast.findMany({ orderBy: { createdAt: "desc" } });
  }

  async withdraw(id: string) {
    const broadcast = await this.prisma.platformBroadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException("Broadcast not found");
    await this.prisma.platformBroadcast.delete({ where: { id } });
  }

  private async pushToAudience(input: CreateBroadcastInput, broadcastId: string) {
    // Every tenant, so no school scoping — this is the one place that's
    // deliberately platform-wide.
    const recipients = await this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(input.audienceRoles.length > 0 ? { role: { in: input.audienceRoles } } : {}),
      },
      select: { id: true },
    });

    await this.notifications.sendPush(
      recipients.map((recipient) => recipient.id),
      {
        title: input.title,
        body: input.body.slice(0, 160),
        data: { type: "BROADCAST", broadcastId },
      },
    );
  }
}
