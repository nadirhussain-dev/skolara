import { Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import type { CreateApiKeyInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

const PUBLIC_SELECT = {
  id: true,
  schoolId: true,
  name: true,
  keyPrefix: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
} as const;

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, input: CreateApiKeyInput) {
    const rawKey = `sk_skolara_${randomBytes(24).toString("hex")}`;
    const hashedKey = createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 14);

    const record = await this.prisma.apiKey.create({
      data: { schoolId, name: input.name, keyPrefix, hashedKey },
      select: PUBLIC_SELECT,
    });

    return { ...record, rawKey };
  }

  findAll(schoolId: string) {
    return this.prisma.apiKey.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      select: PUBLIC_SELECT,
    });
  }

  async revoke(schoolId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, schoolId } });
    if (!key) throw new NotFoundException("API key not found");

    return this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: PUBLIC_SELECT,
    });
  }
}
