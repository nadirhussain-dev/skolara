import { Injectable } from "@nestjs/common";
import type { NotificationInbox } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

/** How many entries the bell and the mobile screen show. */
const PAGE_SIZE = 50;

function toDataRecord(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

/**
 * A user's own notifications. Every query is keyed on the caller's user id,
 * taken from their token, so nobody can read or mark anyone else's.
 */
@Injectable()
export class InboxService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string): Promise<NotificationInbox> {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return {
      unreadCount,
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        data: toDataRecord(n.data),
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
    };
  }

  async unreadCount(userId: string): Promise<{ unreadCount: number }> {
    return { unreadCount: await this.prisma.notification.count({ where: { userId, readAt: null } }) };
  }

  /** Marks the given entries read, or all of them when no ids are given. */
  async markRead(userId: string, ids?: string[]): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
