import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  AssignStudentToBusInput,
  CreateBusInput,
  ReportBusLocationInput,
} from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TransportService {
  constructor(private prisma: PrismaService) {}

  createBus(schoolId: string, input: CreateBusInput) {
    return this.prisma.bus.create({ data: { schoolId, ...input } });
  }

  findBuses(schoolId: string) {
    return this.prisma.bus.findMany({ where: { schoolId }, orderBy: { routeName: "asc" } });
  }

  async assignStudent(schoolId: string, busId: string, input: AssignStudentToBusInput) {
    const bus = await this.prisma.bus.findFirst({ where: { id: busId, schoolId } });
    if (!bus) throw new NotFoundException("Bus not found");

    return this.prisma.busAssignment.upsert({
      where: { studentId: input.studentId },
      create: { busId, studentId: input.studentId },
      update: { busId },
    });
  }

  async reportLocation(schoolId: string, busId: string, input: ReportBusLocationInput) {
    const bus = await this.prisma.bus.findFirst({ where: { id: busId, schoolId } });
    if (!bus) throw new NotFoundException("Bus not found");

    return this.prisma.busLocationPing.create({
      data: { busId, latitude: input.latitude, longitude: input.longitude },
    });
  }

  async latestLocation(schoolId: string, busId: string) {
    const bus = await this.prisma.bus.findFirst({ where: { id: busId, schoolId } });
    if (!bus) throw new NotFoundException("Bus not found");

    return this.prisma.busLocationPing.findFirst({
      where: { busId },
      orderBy: { recordedAt: "desc" },
    });
  }

  async findForStudent(schoolId: string, studentId: string) {
    const assignment = await this.prisma.busAssignment.findUnique({
      where: { studentId },
      include: { bus: true },
    });
    if (!assignment || assignment.bus.schoolId !== schoolId) return null;

    const latestPing = await this.prisma.busLocationPing.findFirst({
      where: { busId: assignment.busId },
      orderBy: { recordedAt: "desc" },
    });

    return { bus: assignment.bus, latestLocation: latestPing };
  }
}
