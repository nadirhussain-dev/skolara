import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { CERTIFICATE_LABELS, type CertificateKind } from "@skolara/types";
import {
  brandColor,
  documentStyles,
  fieldRow,
  letterhead,
  type SchoolLetterhead,
} from "../documents/document-theme";

export interface CertificateData {
  school: SchoolLetterhead;
  kind: CertificateKind;
  serial: string;
  studentName: string;
  fatherName: string | null;
  admissionNumber: string;
  className: string | null;
  dateOfBirth: Date;
  enrolledOn: Date;
  leavingDate: Date | null;
  remarks: string | null;
  issuedOn: Date;
}

function date(value: Date): string {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * The certifying sentence. Each kind asserts something different, so the
 * wording is per-kind rather than one paragraph with the type swapped in —
 * these are quasi-legal documents and vague phrasing makes them useless.
 */
function body(data: CertificateData): string {
  const who = `${data.studentName}, ${data.fatherName ? `child of ${data.fatherName}, ` : ""}`;
  const cls = data.className ? ` of class ${data.className}` : "";

  switch (data.kind) {
    case "ENROLMENT":
      return `This is to certify that ${who}bearing admission number ${data.admissionNumber}, is a bona fide student${cls} of this institution, and has been enrolled here since ${date(data.enrolledOn)}.`;
    case "CHARACTER":
      return `This is to certify that ${who}bearing admission number ${data.admissionNumber}, was a student${cls} of this institution. To the best of our knowledge, their conduct and character during this period remained satisfactory.`;
    case "LEAVING":
      return `This is to certify that ${who}bearing admission number ${data.admissionNumber}, was a student${cls} of this institution from ${date(data.enrolledOn)} until ${data.leavingDate ? date(data.leavingDate) : date(data.issuedOn)}. All dues owed to the institution have been settled, and no objection is raised to their admission elsewhere.`;
    case "BONAFIDE":
      return `This is to certify that ${who}bearing admission number ${data.admissionNumber}, is a bona fide student${cls} of this institution. This certificate is issued on request for official purposes.`;
  }
}

export function certificateDefinition(data: CertificateData): TDocumentDefinitions {
  const title = CERTIFICATE_LABELS[data.kind];

  return {
    info: { title: `${title} — ${data.studentName}` },
    content: [
      letterhead(data.school, "Certificate"),

      {
        text: title.toUpperCase(),
        alignment: "center",
        fontSize: 15,
        bold: true,
        color: brandColor(data.school),
        margin: [0, 24, 0, 4],
      },
      {
        text: `Serial ${data.serial}`,
        alignment: "center",
        style: "label",
        margin: [0, 0, 0, 24],
      },

      { text: body(data), fontSize: 11, lineHeight: 1.6, alignment: "justify" },

      { text: "Student details", style: "heading" },
      fieldRow([
        { label: "Date of birth", value: date(data.dateOfBirth) },
        { label: "Admission no.", value: data.admissionNumber },
        { label: "Class", value: data.className ?? "Not assigned" },
      ]),

      ...(data.remarks
        ? [
            { text: "Remarks", style: "heading" as const },
            { text: data.remarks, fontSize: 10, lineHeight: 1.5 },
          ]
        : []),

      // Certificates are presented to third parties, so unlike the other
      // documents this one carries a real signature block.
      {
        columns: [
          { text: `Issued on ${date(data.issuedOn)}`, style: "label" },
          {
            stack: [
              { text: " ", margin: [0, 24, 0, 0] },
              {
                canvas: [
                  { type: "line", x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.7, lineColor: "#6B6684" },
                ],
              },
              {
                text: "Principal / authorised signatory",
                style: "label",
                margin: [0, 4, 0, 0],
              },
            ],
            width: 170,
          },
        ],
        margin: [0, 44, 0, 0],
      },
    ],
    styles: documentStyles,
  };
}
