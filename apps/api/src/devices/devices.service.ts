import { Injectable } from "@nestjs/common";
import type { RegisterDeviceInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Upsert rather than create: the same push token follows a device across
   * sign-outs and re-installs, and can end up owned by a different user if
   * two people share a handset — so ownership is reassigned, not duplicated.
   */
  register(userId: string, input: RegisterDeviceInput) {
    return this.prisma.deviceToken.upsert({
      where: { token: input.token },
      create: { userId, token: input.token, platform: input.platform },
      update: { userId, platform: input.platform, lastSeenAt: new Date() },
    });
  }

  async unregister(userId: string, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { userId, token } });
  }
}
