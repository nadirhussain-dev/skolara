import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CertificatesService } from "./certificates.service";
import type { DocumentsService } from "../documents/documents.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const STUDENT = "3f7b21c8-0000-4000-8000-000000000000";

describe("CertificatesService", () => {
  let prisma: { studentProfile: { findFirst: jest.Mock } };
  let documents: { renderAndStore: jest.Mock };
  let service: CertificatesService;

  beforeEach(() => {
    prisma = {
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: STUDENT,
          admissionNumber: "ADM-0007",
          dateOfBirth: new Date("2012-04-03"),
          user: { firstName: "Ayesha", lastName: "Khan", createdAt: new Date("2024-08-01") },
          class: { name: "Grade 8", section: "B" },
          school: { name: "Test School", primaryColor: "#6D28D9" },
          parentLinks: [{ parentUser: { firstName: "Imran", lastName: "Khan" } }],
        }),
      },
    };
    documents = {
      renderAndStore: jest.fn().mockResolvedValue({ url: "https://storage.test/cert.pdf" }),
    };
    service = new CertificatesService(
      prisma as unknown as PrismaService,
      documents as unknown as DocumentsService,
    );
  });

  function renderedText(): string {
    return JSON.stringify(documents.renderAndStore.mock.calls[0][1]);
  }

  it("issues an enrolment certificate asserting current enrolment", async () => {
    const result = await service.issue(SCHOOL, { studentId: STUDENT, kind: "ENROLMENT" });

    expect(result.url).toBe("https://storage.test/cert.pdf");
    expect(renderedText()).toContain("is a bona fide student");
    expect(renderedText()).toContain("Ayesha Khan");
    expect(renderedText()).toContain("ADM-0007");
  });

  it("names the parent on the certificate when one is linked", async () => {
    await service.issue(SCHOOL, { studentId: STUDENT, kind: "CHARACTER" });
    expect(renderedText()).toContain("child of Imran Khan");
  });

  it("omits the parent clause rather than printing an empty one", async () => {
    prisma.studentProfile.findFirst.mockResolvedValue({
      id: STUDENT,
      admissionNumber: "ADM-0007",
      dateOfBirth: new Date("2012-04-03"),
      user: { firstName: "Ayesha", lastName: "Khan", createdAt: new Date("2024-08-01") },
      class: null,
      school: { name: "Test School", primaryColor: null },
      parentLinks: [],
    });

    await service.issue(SCHOOL, { studentId: STUDENT, kind: "CHARACTER" });
    expect(renderedText()).not.toContain("child of");
    expect(renderedText()).toContain("Not assigned");
  });

  it("uses past tense for a character certificate, present for enrolment", async () => {
    await service.issue(SCHOOL, { studentId: STUDENT, kind: "CHARACTER" });
    expect(renderedText()).toContain("was a student");
  });

  it("refuses a leaving certificate with no leaving date", async () => {
    await expect(
      service.issue(SCHOOL, { studentId: STUDENT, kind: "LEAVING" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(documents.renderAndStore).not.toHaveBeenCalled();
  });

  it("states dues are settled on a leaving certificate", async () => {
    await service.issue(SCHOOL, {
      studentId: STUDENT,
      kind: "LEAVING",
      leavingDate: new Date("2026-06-30"),
    });
    expect(renderedText()).toContain("All dues owed to the institution have been settled");
    expect(renderedText()).toContain("30 June 2026");
  });

  it("includes remarks when the office adds them", async () => {
    await service.issue(SCHOOL, {
      studentId: STUDENT,
      kind: "CHARACTER",
      remarks: "Represented the school at the district debate.",
    });
    expect(renderedText()).toContain("district debate");
  });

  it("gives the same serial for the same student and kind, so a reissue matches the office record", async () => {
    const first = await service.issue(SCHOOL, { studentId: STUDENT, kind: "ENROLMENT" });
    const second = await service.issue(SCHOOL, { studentId: STUDENT, kind: "ENROLMENT" });
    expect(first.serial).toBe(second.serial);
  });

  it("gives different serials to different certificate kinds", async () => {
    const enrolment = await service.issue(SCHOOL, { studentId: STUDENT, kind: "ENROLMENT" });
    const character = await service.issue(SCHOOL, { studentId: STUDENT, kind: "CHARACTER" });
    expect(enrolment.serial).not.toBe(character.serial);
  });

  it("rejects a student from another school", async () => {
    prisma.studentProfile.findFirst.mockResolvedValue(null);
    await expect(
      service.issue(SCHOOL, { studentId: STUDENT, kind: "ENROLMENT" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
