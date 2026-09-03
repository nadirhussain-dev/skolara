import { BadRequestException, NotFoundException } from "@nestjs/common";
import { LessonsService } from "./lessons.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const CLASS = "class-1";
const TEACHER = "teacher-1";
const TOPIC = "topic-1";

const yesterday = () => new Date(Date.now() - 24 * 3600 * 1000);
const tomorrow = () => new Date(Date.now() + 24 * 3600 * 1000);

describe("LessonsService", () => {
  let prisma: {
    syllabusTopic: {
      createMany: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    lessonPlan: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    schoolClass: { findFirst: jest.Mock };
    period: { findFirst: jest.Mock };
  };
  let service: LessonsService;

  beforeEach(() => {
    prisma = {
      syllabusTopic: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findFirst: jest.fn().mockResolvedValue({ sortOrder: 4 }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id: TOPIC }),
        delete: jest.fn(),
      },
      lessonPlan: {
        create: jest.fn().mockResolvedValue({ id: "plan-1" }),
        findFirst: jest.fn().mockResolvedValue({ id: "plan-1", classId: CLASS }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id: "plan-1" }),
        delete: jest.fn(),
      },
      schoolClass: { findFirst: jest.fn().mockResolvedValue({ id: CLASS }) },
      period: { findFirst: jest.fn().mockResolvedValue({ id: "period-1" }) },
    };
    service = new LessonsService(prisma as unknown as PrismaService);
  });

  describe("addTopics", () => {
    it("continues the existing ordering instead of restarting it", async () => {
      await service.addTopics(SCHOOL, TEACHER, {
        classId: CLASS,
        subject: "Physics",
        term: "Term 1",
        topics: [{ title: "Waves" }, { title: "Optics" }],
      });

      const rows = prisma.syllabusTopic.createMany.mock.calls[0][0].data;
      expect(rows.map((row: { sortOrder: number }) => row.sortOrder)).toEqual([5, 6]);
    });

    it("starts at zero on an empty syllabus", async () => {
      prisma.syllabusTopic.findFirst.mockResolvedValue(null);

      await service.addTopics(SCHOOL, TEACHER, {
        classId: CLASS,
        subject: "Physics",
        term: "Term 1",
        topics: [{ title: "Waves" }],
      });

      expect(prisma.syllabusTopic.createMany.mock.calls[0][0].data[0].sortOrder).toBe(0);
    });

    it("skips duplicates rather than failing the batch", async () => {
      await service.addTopics(SCHOOL, TEACHER, {
        classId: CLASS,
        subject: "Physics",
        term: "Term 1",
        topics: [{ title: "Waves" }, { title: "Optics" }],
      });

      expect(prisma.syllabusTopic.createMany.mock.calls[0][0].skipDuplicates).toBe(true);
    });

    it("refuses a class in another school", async () => {
      prisma.schoolClass.findFirst.mockResolvedValue(null);

      await expect(
        service.addTopics(SCHOOL, TEACHER, {
          classId: CLASS,
          subject: "Physics",
          term: "Term 1",
          topics: [{ title: "Waves" }],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.syllabusTopic.createMany).not.toHaveBeenCalled();
    });
  });

  describe("updateTopic", () => {
    it("stamps completedOn when a topic is marked covered", async () => {
      prisma.syllabusTopic.findFirst.mockResolvedValue({
        id: TOPIC,
        status: "IN_PROGRESS",
      });

      await service.updateTopic(SCHOOL, TOPIC, { status: "COMPLETED" });

      const { data } = prisma.syllabusTopic.update.mock.calls[0][0];
      expect(data.completedOn).toBeInstanceOf(Date);
    });

    it("clears completedOn when a topic is reopened", async () => {
      prisma.syllabusTopic.findFirst.mockResolvedValue({ id: TOPIC, status: "COMPLETED" });

      await service.updateTopic(SCHOOL, TOPIC, { status: "IN_PROGRESS" });

      expect(prisma.syllabusTopic.update.mock.calls[0][0].data.completedOn).toBeNull();
    });

    it("leaves completedOn alone when the status doesn't change", async () => {
      prisma.syllabusTopic.findFirst.mockResolvedValue({ id: TOPIC, status: "COMPLETED" });

      await service.updateTopic(SCHOOL, TOPIC, { status: "COMPLETED", title: "Waves II" });

      expect(prisma.syllabusTopic.update.mock.calls[0][0].data).not.toHaveProperty(
        "completedOn",
      );
    });

    it("refuses a topic in another school", async () => {
      prisma.syllabusTopic.findFirst.mockResolvedValue(null);

      await expect(service.updateTopic(SCHOOL, TOPIC, { status: "COMPLETED" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("coverage", () => {
    it("groups by subject and term and derives the percentage", async () => {
      prisma.syllabusTopic.findMany.mockResolvedValue([
        { subject: "Physics", term: "Term 1", status: "COMPLETED", plannedForDate: null },
        { subject: "Physics", term: "Term 1", status: "COMPLETED", plannedForDate: null },
        { subject: "Physics", term: "Term 1", status: "IN_PROGRESS", plannedForDate: null },
        { subject: "Physics", term: "Term 1", status: "NOT_STARTED", plannedForDate: null },
        { subject: "Maths", term: "Term 1", status: "NOT_STARTED", plannedForDate: null },
      ]);

      const coverage = await service.coverage(SCHOOL, CLASS);

      // Alphabetical by subject, so Maths comes first.
      expect(coverage).toHaveLength(2);
      expect(coverage[0]).toEqual(
        expect.objectContaining({ subject: "Maths", total: 1, percentComplete: 0 }),
      );
      expect(coverage[1]).toEqual(
        expect.objectContaining({
          subject: "Physics",
          total: 4,
          completed: 2,
          inProgress: 1,
          notStarted: 1,
          percentComplete: 50,
        }),
      );
    });

    it("counts a topic overdue only when its planned date has passed and it isn't covered", async () => {
      prisma.syllabusTopic.findMany.mockResolvedValue([
        { subject: "Physics", term: "Term 1", status: "NOT_STARTED", plannedForDate: yesterday() },
        { subject: "Physics", term: "Term 1", status: "NOT_STARTED", plannedForDate: tomorrow() },
        // Late but taught: not something to chase.
        { subject: "Physics", term: "Term 1", status: "COMPLETED", plannedForDate: yesterday() },
        // No date set: nothing to be late against.
        { subject: "Physics", term: "Term 1", status: "NOT_STARTED", plannedForDate: null },
      ]);

      const [physics] = await service.coverage(SCHOOL, CLASS);

      expect(physics.overdue).toBe(1);
    });

    it("returns nothing for a class with no syllabus rather than a zeroed row", async () => {
      await expect(service.coverage(SCHOOL, CLASS)).resolves.toEqual([]);
    });
  });

  describe("createPlan", () => {
    const input = {
      classId: CLASS,
      subject: "Physics",
      title: "Refraction",
      date: tomorrow(),
    };

    it("attributes the plan to the teacher writing it", async () => {
      await service.createPlan(SCHOOL, TEACHER, input);

      expect(prisma.lessonPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ teacherUserId: TEACHER, schoolId: SCHOOL }),
        }),
      );
    });

    it("refuses a topic from a different class or subject", async () => {
      prisma.syllabusTopic.findFirst.mockResolvedValue(null);

      await expect(
        service.createPlan(SCHOOL, TEACHER, { ...input, topicId: TOPIC }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.lessonPlan.create).not.toHaveBeenCalled();
    });

    it("accepts a topic on the same class and subject", async () => {
      prisma.syllabusTopic.findFirst.mockResolvedValue({ id: TOPIC });

      await service.createPlan(SCHOOL, TEACHER, { ...input, topicId: TOPIC });

      expect(prisma.syllabusTopic.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: TOPIC,
            schoolId: SCHOOL,
            classId: CLASS,
            subject: "Physics",
          }),
        }),
      );
      expect(prisma.lessonPlan.create).toHaveBeenCalled();
    });

    it("refuses a period from another school", async () => {
      prisma.period.findFirst.mockResolvedValue(null);

      await expect(
        service.createPlan(SCHOOL, TEACHER, { ...input, periodId: "period-9" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findPlans", () => {
    it("bounds the query by the date range when one is given", async () => {
      const from = yesterday();
      const to = tomorrow();

      await service.findPlans(SCHOOL, { teacherUserId: TEACHER, from, to });

      expect(prisma.lessonPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: SCHOOL, teacherUserId: TEACHER, date: { gte: from, lte: to } },
        }),
      );
    });

    it("leaves the date unfiltered when no range is given", async () => {
      await service.findPlans(SCHOOL, { classId: CLASS });

      expect(prisma.lessonPlan.findMany.mock.calls[0][0].where).toEqual({
        schoolId: SCHOOL,
        classId: CLASS,
      });
    });
  });
});
