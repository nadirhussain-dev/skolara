import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { HostelService } from "./hostel.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const ROOM = "room-1";
const STUDENT = "student-1";

const duplicate = () =>
  new Prisma.PrismaClientKnownRequestError("unique", {
    code: "P2002",
    clientVersion: "test",
  });

describe("HostelService", () => {
  let prisma: {
    hostelRoom: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    hostelAllocation: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      updateMany: jest.Mock;
    };
    studentProfile: { findFirst: jest.Mock };
  };
  let service: HostelService;

  beforeEach(() => {
    prisma = {
      hostelRoom: {
        create: jest.fn().mockResolvedValue({ id: ROOM }),
        findFirst: jest.fn().mockResolvedValue({ id: ROOM, capacity: 4, roomNumber: "12" }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id: ROOM }),
        delete: jest.fn(),
      },
      hostelAllocation: {
        create: jest.fn().mockResolvedValue({ id: "allocation-1", bedNumber: 1 }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "allocation-1" }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      studentProfile: { findFirst: jest.fn().mockResolvedValue({ id: STUDENT }) },
    };
    service = new HostelService(prisma as unknown as PrismaService);
  });

  const room = (capacity: number, occupiedBeds: number[], overrides = {}) => ({
    id: ROOM,
    blockName: "A",
    roomNumber: "12",
    floor: 1,
    capacity,
    notes: null,
    allocations: occupiedBeds.map((bedNumber) => ({ bedNumber })),
    ...overrides,
  });

  describe("createRoom", () => {
    it("reports a duplicate room number in a block as a conflict", async () => {
      prisma.hostelRoom.create.mockRejectedValue(duplicate());

      await expect(
        service.createRoom(SCHOOL, { blockName: "A", roomNumber: "12", capacity: 4 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("updateRoom", () => {
    it("refuses to shrink a room below its highest occupied bed", async () => {
      prisma.hostelAllocation.findFirst.mockResolvedValue({ bedNumber: 4 });

      await expect(
        service.updateRoom(SCHOOL, ROOM, { blockName: "A", roomNumber: "12", capacity: 3 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.hostelRoom.update).not.toHaveBeenCalled();
    });

    it("allows shrinking to exactly the highest occupied bed", async () => {
      prisma.hostelAllocation.findFirst.mockResolvedValue({ bedNumber: 3 });

      await service.updateRoom(SCHOOL, ROOM, {
        blockName: "A",
        roomNumber: "12",
        capacity: 3,
      });

      expect(prisma.hostelRoom.update).toHaveBeenCalled();
    });

    it("allows any capacity in an empty room", async () => {
      prisma.hostelAllocation.findFirst.mockResolvedValue(null);

      await service.updateRoom(SCHOOL, ROOM, {
        blockName: "A",
        roomNumber: "12",
        capacity: 1,
      });

      expect(prisma.hostelRoom.update).toHaveBeenCalled();
    });
  });

  describe("removeRoom", () => {
    it("refuses while anyone still lives there", async () => {
      prisma.hostelAllocation.findFirst.mockResolvedValue({ id: "allocation-1" });

      await expect(service.removeRoom(SCHOOL, ROOM)).rejects.toThrow(BadRequestException);
      expect(prisma.hostelRoom.delete).not.toHaveBeenCalled();
    });
  });

  describe("listRooms", () => {
    it("reports which beds are free, not just how many", async () => {
      prisma.hostelRoom.findMany.mockResolvedValue([room(4, [1, 3])]);

      const [entry] = await service.listRooms(SCHOOL);

      expect(entry.occupied).toBe(2);
      expect(entry.freeBeds).toEqual([2, 4]);
    });

    it("can hide full rooms", async () => {
      prisma.hostelRoom.findMany.mockResolvedValue([
        room(2, [1, 2]),
        { ...room(2, [1]), id: "room-2", roomNumber: "13" },
      ]);

      const rooms = await service.listRooms(SCHOOL, { onlyWithFreeBeds: true });

      expect(rooms).toHaveLength(1);
      expect(rooms[0].roomNumber).toBe("13");
    });
  });

  describe("allocate", () => {
    it("refuses a bed number the room doesn't have", async () => {
      await expect(
        service.allocate(SCHOOL, ROOM, { studentId: STUDENT, bedNumber: 5 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.hostelAllocation.create).not.toHaveBeenCalled();
    });

    it("picks the lowest free bed when none is named", async () => {
      prisma.hostelAllocation.findMany.mockResolvedValue([{ bedNumber: 1 }, { bedNumber: 2 }]);

      await service.allocate(SCHOOL, ROOM, { studentId: STUDENT });

      expect(prisma.hostelAllocation.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ bedNumber: 3 }) }),
      );
    });

    it("retries the next free bed when another warden takes the first", async () => {
      prisma.hostelAllocation.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ bedNumber: 1 }]);
      prisma.hostelAllocation.create
        .mockRejectedValueOnce(duplicate())
        .mockResolvedValueOnce({ id: "allocation-1", bedNumber: 2 });

      const result = await service.allocate(SCHOOL, ROOM, { studentId: STUDENT });

      expect(result).toEqual(expect.objectContaining({ bedNumber: 2 }));
      expect(prisma.hostelAllocation.create).toHaveBeenCalledTimes(2);
    });

    it("refuses when the room is full", async () => {
      prisma.hostelAllocation.findMany.mockResolvedValue([
        { bedNumber: 1 },
        { bedNumber: 2 },
        { bedNumber: 3 },
        { bedNumber: 4 },
      ]);

      await expect(service.allocate(SCHOOL, ROOM, { studentId: STUDENT })).rejects.toThrow(
        ConflictException,
      );
    });

    it("names the room a student already lives in rather than saying 'bed taken'", async () => {
      prisma.hostelAllocation.create.mockRejectedValue(duplicate());
      // The unique violation was on the student index, not the bed index.
      prisma.hostelAllocation.findFirst.mockResolvedValue({
        id: "allocation-9",
        room: { blockName: "B", roomNumber: "4" },
      });

      await expect(
        service.allocate(SCHOOL, ROOM, { studentId: STUDENT, bedNumber: 1 }),
      ).rejects.toThrow(/already lives in B 4/);
    });

    it("refuses a student from another school", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.allocate(SCHOOL, ROOM, { studentId: STUDENT, bedNumber: 1 }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.hostelAllocation.create).not.toHaveBeenCalled();
    });

    it("refuses a room in another school", async () => {
      prisma.hostelRoom.findFirst.mockResolvedValue(null);

      await expect(
        service.allocate(SCHOOL, ROOM, { studentId: STUDENT, bedNumber: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("vacate", () => {
    it("stamps the move-out date rather than deleting the row", async () => {
      await service.vacate(SCHOOL, "allocation-1");

      expect(prisma.hostelAllocation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "allocation-1", schoolId: SCHOOL, vacatedAt: null },
          data: { vacatedAt: expect.any(Date) },
        }),
      );
    });

    it("distinguishes an already-vacated allocation from a missing one", async () => {
      prisma.hostelAllocation.updateMany.mockResolvedValue({ count: 0 });
      prisma.hostelAllocation.findFirst.mockResolvedValue({ vacatedAt: new Date() });

      await expect(service.vacate(SCHOOL, "allocation-1")).rejects.toThrow(
        BadRequestException,
      );

      prisma.hostelAllocation.findFirst.mockResolvedValue(null);
      await expect(service.vacate(SCHOOL, "allocation-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("summary", () => {
    it("aggregates occupancy per block and overall", async () => {
      prisma.hostelRoom.findMany.mockResolvedValue([
        room(4, [1, 2]),
        { ...room(4, [1, 2, 3, 4]), id: "room-2", roomNumber: "13" },
        { ...room(2, []), id: "room-3", blockName: "B", roomNumber: "1" },
      ]);

      const summary = await service.summary(SCHOOL);

      expect(summary).toEqual(
        expect.objectContaining({ rooms: 3, capacity: 10, occupied: 6, occupancyRate: 60 }),
      );
      expect(summary.byBlock).toEqual([
        expect.objectContaining({ blockName: "A", rooms: 2, capacity: 8, occupied: 6, occupancyRate: 75 }),
        expect.objectContaining({ blockName: "B", rooms: 1, capacity: 2, occupied: 0, occupancyRate: 0 }),
      ]);
    });

    it("reports zero rather than dividing by nothing on an empty hostel", async () => {
      await expect(service.summary(SCHOOL)).resolves.toEqual(
        expect.objectContaining({ rooms: 0, capacity: 0, occupied: 0, occupancyRate: 0 }),
      );
    });
  });
});
