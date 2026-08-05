import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import type {
  CreateSchoolInput,
  SubscriptionStatus,
  UpdateBrandingInput,
} from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

const TRIAL_DAYS = 14;

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateSchoolInput) {
    const passwordHash = await bcrypt.hash(input.adminPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: input.name,
          subdomain: input.subdomain,
          plan: input.plan,
          subscriptionStatus: "PENDING",
        },
      });

      await tx.user.create({
        data: {
          schoolId: school.id,
          role: "SCHOOL_ADMIN",
          email: input.adminEmail,
          passwordHash,
          firstName: input.adminFirstName,
          lastName: input.adminLastName,
        },
      });

      return school;
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

  async approve(id: string) {
    const school = await this.findOne(id);
    if (school.subscriptionStatus !== "PENDING") {
      throw new BadRequestException("Only pending schools can be approved");
    }
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    return this.prisma.school.update({
      where: { id },
      data: { subscriptionStatus: "TRIAL", trialEndsAt },
    });
  }

  async reject(id: string) {
    const school = await this.findOne(id);
    if (school.subscriptionStatus !== "PENDING") {
      throw new BadRequestException("Only pending schools can be rejected");
    }
    return this.prisma.school.update({
      where: { id },
      data: { subscriptionStatus: "REJECTED" },
    });
  }

  async updateSubscriptionStatus(id: string, status: SubscriptionStatus) {
    await this.findOne(id);
    return this.prisma.school.update({
      where: { id },
      data: { subscriptionStatus: status },
    });
  }

  async updateBranding(id: string, input: UpdateBrandingInput) {
    await this.findOne(id);
    return this.prisma.school.update({
      where: { id },
      data: {
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        ...(input.primaryColor !== undefined ? { primaryColor: input.primaryColor } : {}),
      },
    });
  }
}
