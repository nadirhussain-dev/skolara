import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateSchoolInput, SubscriptionStatus } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  create(input: CreateSchoolInput) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    return this.prisma.school.create({
      data: {
        name: input.name,
        subdomain: input.subdomain,
        plan: input.plan,
        subscriptionStatus: "TRIAL",
        trialEndsAt,
      },
    });
  }

  findAll() {
    return this.prisma.school.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException("School not found");
    return school;
  }

  async updateSubscriptionStatus(id: string, status: SubscriptionStatus) {
    await this.findOne(id);
    return this.prisma.school.update({
      where: { id },
      data: { subscriptionStatus: status },
    });
  }
}
