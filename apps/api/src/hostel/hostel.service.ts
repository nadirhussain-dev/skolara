import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  AllocateHostelBedInput,
  HostelOccupancy,
  HostelSummary,
  UpsertHostelRoomInput,
} from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

const RESIDENT_INCLUDE = {
  student: {
    select: {
      id: true,
      admissionNumber: true,
      user: { select: { firstName: true, lastName: true, phone: true } },
      class: { select: { id: true, name: true, section: true } },
    },
  },
} as const;

@Injectable()
export class HostelService {
  constructor(private prisma: PrismaService) {}

  // ---------- rooms ----------

  async createRoom(schoolId: string, input: UpsertHostelRoomInput) {
    try {
      return await this.prisma.hostelRoom.create({
        data: {
          schoolId,
          blockName: input.blockName,
          roomNumber: input.roomNumber,
          floor: input.floor ?? null,
          capacity: input.capacity,
          notes: input.notes ?? null,
        },
      });
    } catch (error) {
      throw this.translateDuplicateRoom(error);
    }
  }

  /**
   * Capacity can be raised freely but only lowered to the number of beds
   * currently in use — shrinking a room under its residents would leave people
   * allocated to beds the room no longer admits to having.
   */
  async updateRoom(schoolId: string, id: string, input: UpsertHostelRoomInput) {
    await this.ownRoom(schoolId, id);

    const highestOccupiedBed = await this.prisma.hostelAllocation.findFirst({
      where: { roomId: id, vacatedAt: null },
      orderBy: { bedNumber: "desc" },
      select: { bedNumber: true },
    });
    if (highestOccupiedBed && input.capacity < highestOccupiedBed.bedNumber) {
      throw new BadRequestException(
        `Bed ${highestOccupiedBed.bedNumber} is occupied — move that student before reducing capacity to ${input.capacity}`,
      );
    }

    try {
      return await this.prisma.hostelRoom.update({
        where: { id },
        data: {
          blockName: input.blockName,
          roomNumber: input.roomNumber,
          floor: input.floor ?? null,
          capacity: input.capacity,
          notes: input.notes ?? null,
        },
      });
    } catch (error) {
      throw this.translateDuplicateRoom(error);
    }
  }

  async removeRoom(schoolId: string, id: string) {
    await this.ownRoom(schoolId, id);
    const resident = await this.prisma.hostelAllocation.findFirst({
      where: { roomId: id, vacatedAt: null },
      select: { id: true },
    });
    if (resident) {
      throw new BadRequestException(
        "Someone still lives in that room — move them out before deleting it",
      );
    }
    await this.prisma.hostelRoom.delete({ where: { id } });
  }

  /**
   * Rooms with their occupancy and, crucially, which beds are free — the one
   * thing a warden looking at this list is trying to find out.
   */
  async listRooms(
    schoolId: string,
    filters: { blockName?: string; onlyWithFreeBeds?: boolean } = {},
  ): Promise<(HostelOccupancy & { notes: string | null })[]> {
    const rooms = await this.prisma.hostelRoom.findMany({
      where: { schoolId, ...(filters.blockName ? { blockName: filters.blockName } : {}) },
      orderBy: [{ blockName: "asc" }, { roomNumber: "asc" }],
      include: {
        allocations: {
          where: { vacatedAt: null },
          select: { bedNumber: true },
        },
      },
    });

    const withOccupancy = rooms.map((room) => {
      const taken = new Set(room.allocations.map((allocation) => allocation.bedNumber));
      const freeBeds = Array.from({ length: room.capacity }, (_, index) => index + 1).filter(
        (bed) => !taken.has(bed),
      );
      return {
        roomId: room.id,
        blockName: room.blockName,
        roomNumber: room.roomNumber,
        floor: room.floor,
        capacity: room.capacity,
        occupied: taken.size,
        freeBeds,
        notes: room.notes,
      };
    });

    return filters.onlyWithFreeBeds
      ? withOccupancy.filter((room) => room.freeBeds.length > 0)
      : withOccupancy;
  }

  /** Who is in one room now, with the history of who was there before. */
  async roomDetail(schoolId: string, id: string) {
    const room = await this.prisma.hostelRoom.findFirst({
      where: { id, schoolId },
      include: {
        allocations: {
          orderBy: [{ vacatedAt: "asc" }, { bedNumber: "asc" }],
          include: RESIDENT_INCLUDE,
        },
      },
    });
    if (!room) throw new NotFoundException("Room not found");

    const current = room.allocations.filter((allocation) => allocation.vacatedAt === null);
    const taken = new Set(current.map((allocation) => allocation.bedNumber));
    return {
      ...room,
      residents: current,
      past: room.allocations.filter((allocation) => allocation.vacatedAt !== null),
      freeBeds: Array.from({ length: room.capacity }, (_, index) => index + 1).filter(
        (bed) => !taken.has(bed),
      ),
    };
  }

  // ---------- allocations ----------

  /**
   * Puts a student in a bed.
   *
   * With no bed number, the lowest free bed is chosen here rather than by the
   * client: a client that reads the free list and then posts a number is
   * racing every other warden doing the same, and would lose that race with a
   * confusing error. The retry loop below turns the race into a second attempt
   * on the next free bed instead.
   */
  async allocate(schoolId: string, roomId: string, input: AllocateHostelBedInput) {
    const room = await this.ownRoom(schoolId, roomId);
    await this.assertStudent(schoolId, input.studentId);

    if (input.bedNumber !== undefined) {
      if (input.bedNumber > room.capacity) {
        throw new BadRequestException(
          `Room ${room.roomNumber} has ${room.capacity} beds — there is no bed ${input.bedNumber}`,
        );
      }
      return this.claimBed(schoolId, roomId, input.bedNumber, input);
    }

    // One pass per bed at worst: each failure means somebody else took that
    // bed, so the next attempt uses a freshly read free list.
    for (let attempt = 0; attempt < room.capacity; attempt += 1) {
      const free = await this.freeBeds(roomId, room.capacity);
      if (free.length === 0) {
        throw new ConflictException(`Room ${room.roomNumber} is full`);
      }
      try {
        return await this.claimBed(schoolId, roomId, free[0], input);
      } catch (error) {
        if (error instanceof ConflictException) continue;
        throw error;
      }
    }
    throw new ConflictException(`Room ${room.roomNumber} is full`);
  }

  /** Moving out. The row stays, so the term's occupancy history survives. */
  async vacate(schoolId: string, allocationId: string) {
    const released = await this.prisma.hostelAllocation.updateMany({
      where: { id: allocationId, schoolId, vacatedAt: null },
      data: { vacatedAt: new Date() },
    });
    if (released.count === 0) {
      // Distinguish "already moved out" from "never existed", since one is a
      // duplicate click and the other is a bad link.
      const exists = await this.prisma.hostelAllocation.findFirst({
        where: { id: allocationId, schoolId },
        select: { vacatedAt: true },
      });
      if (!exists) throw new NotFoundException("Allocation not found");
      throw new BadRequestException("That student has already moved out");
    }
    return this.prisma.hostelAllocation.findUniqueOrThrow({
      where: { id: allocationId },
      include: RESIDENT_INCLUDE,
    });
  }

  /** Where one student lives, and where they lived before. */
  async forStudent(schoolId: string, studentId: string) {
    return this.prisma.hostelAllocation.findMany({
      where: { schoolId, studentId },
      orderBy: { allocatedAt: "desc" },
      include: {
        room: { select: { id: true, blockName: true, roomNumber: true, floor: true } },
      },
    });
  }

  /** Occupancy across the hostel, per block and overall. */
  async summary(schoolId: string): Promise<HostelSummary> {
    const rooms = await this.listRooms(schoolId);

    const blocks = new Map<string, { rooms: number; capacity: number; occupied: number }>();
    for (const room of rooms) {
      const block = blocks.get(room.blockName) ?? { rooms: 0, capacity: 0, occupied: 0 };
      block.rooms += 1;
      block.capacity += room.capacity;
      block.occupied += room.occupied;
      blocks.set(room.blockName, block);
    }

    const capacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
    const occupied = rooms.reduce((sum, room) => sum + room.occupied, 0);

    return {
      rooms: rooms.length,
      capacity,
      occupied,
      occupancyRate: capacity === 0 ? 0 : Math.round((occupied / capacity) * 100),
      byBlock: [...blocks.entries()]
        .map(([blockName, block]) => ({
          blockName,
          ...block,
          occupancyRate:
            block.capacity === 0 ? 0 : Math.round((block.occupied / block.capacity) * 100),
        }))
        .sort((a, b) => a.blockName.localeCompare(b.blockName)),
    };
  }

  // ---------- internals ----------

  private async claimBed(
    schoolId: string,
    roomId: string,
    bedNumber: number,
    input: AllocateHostelBedInput,
  ) {
    try {
      return await this.prisma.hostelAllocation.create({
        data: {
          schoolId,
          roomId,
          studentId: input.studentId,
          bedNumber,
          notes: input.notes ?? null,
        },
        include: RESIDENT_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Two partial unique indexes can raise this. Which one it was decides
        // whether the caller should retry another bed or fix their request, so
        // it is worth one extra query to say.
        const resident = await this.prisma.hostelAllocation.findFirst({
          where: { studentId: input.studentId, vacatedAt: null },
          include: { room: { select: { blockName: true, roomNumber: true } } },
        });
        if (resident) {
          throw new BadRequestException(
            `That student already lives in ${resident.room.blockName} ${resident.room.roomNumber} — move them out first`,
          );
        }
        throw new ConflictException(`Bed ${bedNumber} was just taken`);
      }
      throw error;
    }
  }

  private async freeBeds(roomId: string, capacity: number): Promise<number[]> {
    const taken = await this.prisma.hostelAllocation.findMany({
      where: { roomId, vacatedAt: null },
      select: { bedNumber: true },
    });
    const used = new Set(taken.map((allocation) => allocation.bedNumber));
    return Array.from({ length: capacity }, (_, index) => index + 1).filter(
      (bed) => !used.has(bed),
    );
  }

  private async ownRoom(schoolId: string, id: string) {
    const room = await this.prisma.hostelRoom.findFirst({
      where: { id, schoolId },
      select: { id: true, capacity: true, roomNumber: true },
    });
    if (!room) throw new NotFoundException("Room not found");
    return room;
  }

  private async assertStudent(schoolId: string, studentId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    });
    // "Not found" rather than "forbidden": confirming a student exists in
    // another school would leak another tenant's data.
    if (!student) throw new NotFoundException("Student not found");
  }

  private translateDuplicateRoom(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new ConflictException("That block already has a room with that number");
    }
    return error;
  }
}
