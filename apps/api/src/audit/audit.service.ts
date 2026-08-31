import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditEntry {
  schoolId: string | null;
  actorUserId: string | null;
  actorLabel: string;
  actorRole: string | null;
  action: string;
  method: string;
  path: string;
  entityId: string | null;
  outcome: "SUCCESS" | "FAILURE";
  statusCode: number;
  ipAddress: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface AuditQuery {
  /** Null restricts to platform-level entries; undefined means "every school". */
  schoolId?: string | null;
  actorUserId?: string;
  outcome?: "SUCCESS" | "FAILURE";
  limit?: number;
  cursor?: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  record(entry: AuditEntry) {
    return this.prisma.auditLog.create({ data: entry });
  }

  async find(query: AuditQuery) {
    const take = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const entries = await this.prisma.auditLog.findMany({
      where: {
        ...(query.schoolId !== undefined ? { schoolId: query.schoolId } : {}),
        ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
        ...(query.outcome ? { outcome: query.outcome } : {}),
      },
      orderBy: { createdAt: "desc" },
      // Over-fetch by one to tell "there's another page" from "that's the end"
      // without a second count query.
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        actorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    const hasMore = entries.length > take;
    const page = hasMore ? entries.slice(0, take) : entries;
    return { entries: page, nextCursor: hasMore ? page[page.length - 1].id : null };
  }
}
