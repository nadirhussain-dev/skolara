import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import {
  TRIAL_DAYS,
  type CreateSchoolInput,
  type RegisterSchoolInput,
  type SubscriptionStatus,
  type UpdateBrandingInput,
} from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Subdomains the platform uses for itself. A school claiming one of these
 * would shadow the marketing site or the API, so they're refused at signup —
 * the web middleware treats the same names as non-tenant hosts.
 */
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "staging",
  "preview",
  "mail",
  "docs",
  "status",
  "support",
  "help",
  "billing",
  "blog",
]);

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

  /**
   * Public self-serve signup. Lands as PENDING for the platform owner to
   * approve — the proposal's "sign up and go live in a day" still has a human
   * check in front of it, because a fraudulent or duplicate school name is
   * cheap to create and expensive to unwind once parents are invited.
   */
  async register(input: RegisterSchoolInput) {
    if (RESERVED_SUBDOMAINS.has(input.subdomain)) {
      throw new ConflictException("That subdomain isn't available");
    }

    const existing = await this.prisma.school.findUnique({
      where: { subdomain: input.subdomain },
      select: { id: true },
    });
    if (existing) throw new ConflictException("That subdomain is already taken");

    const passwordHash = await bcrypt.hash(input.adminPassword, 10);

    const school = await this.prisma.$transaction(async (tx) => {
      const created = await tx.school.create({
        data: {
          name: input.name,
          subdomain: input.subdomain,
          plan: input.plan,
          subscriptionStatus: "PENDING",
        },
      });

      await tx.user.create({
        data: {
          schoolId: created.id,
          role: "SCHOOL_ADMIN",
          email: input.adminEmail,
          passwordHash,
          firstName: input.adminFirstName,
          lastName: input.adminLastName,
          phone: input.contactPhone,
        },
      });

      return created;
    });

    // Only the fields the public form needs back — the full record includes
    // internal billing state the signer-up has no business seeing yet.
    return {
      id: school.id,
      name: school.name,
      subdomain: school.subdomain,
      subscriptionStatus: school.subscriptionStatus,
    };
  }

  /**
   * Whether a subdomain can still be claimed. Lets the signup form say so
   * while the user types rather than failing them on submit.
   */
  async isSubdomainAvailable(subdomain: string) {
    if (RESERVED_SUBDOMAINS.has(subdomain)) return { available: false };
    const existing = await this.prisma.school.findUnique({
      where: { subdomain },
      select: { id: true },
    });
    return { available: !existing };
  }
}
