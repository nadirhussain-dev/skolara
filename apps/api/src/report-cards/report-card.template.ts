import type { TDocumentDefinitions, TableCell } from "pdfmake/interfaces";
import {
  documentStyles,
  fieldRow,
  footer,
  letterhead,
  tableLayout,
  type SchoolLetterhead,
} from "../documents/document-theme";

export interface ReportCardSubject {
  subject: string;
  examType: string;
  marksObtained: number;
  maxMarks: number;
  comments: string | null;
}

export interface ReportCardData {
  school: SchoolLetterhead;
  studentName: string;
  admissionNumber: string;
  className: string;
  term: string;
  subjects: ReportCardSubject[];
  attendanceRate: number | null;
  /** 1-based position in the class by total percentage; null when not ranked. */
  position: number | null;
  classSize: number;
}

/**
 * Cell helpers. Without them TypeScript widens `alignment: "right"` to
 * `string`, which doesn't satisfy pdfmake's Alignment union.
 */
function rightCell(text: string, bold = false): TableCell {
  return { text, alignment: "right", bold };
}

function headerCell(text: string, alignRight = false): TableCell {
  return {
    text,
    style: "tableHeader",
    ...(alignRight ? { alignment: "right" as const } : {}),
  };
}

function percentage(obtained: number, max: number): number {
  return max > 0 ? Math.round((obtained / max) * 100) : 0;
}

/** The letter shown against each subject. Kept here so the PDF and any future on-screen card agree. */
export function gradeLetter(percent: number): string {
  if (percent >= 80) return "A";
  if (percent >= 70) return "B";
  if (percent >= 60) return "C";
  if (percent >= 50) return "D";
  if (percent >= 40) return "E";
  return "F";
}

export function reportCardDefinition(data: ReportCardData): TDocumentDefinitions {
  const totalObtained = data.subjects.reduce((sum, s) => sum + s.marksObtained, 0);
  const totalMax = data.subjects.reduce((sum, s) => sum + s.maxMarks, 0);
  const overall = percentage(totalObtained, totalMax);

  return {
    info: { title: `Report card — ${data.studentName} — ${data.term}` },
    content: [
      letterhead(data.school, "Report card"),

      fieldRow([
        { label: "Student", value: data.studentName },
        { label: "Admission no.", value: data.admissionNumber },
        { label: "Class", value: data.className },
        { label: "Term", value: data.term },
      ]),

      { text: "Results", style: "heading" },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto", "auto"],
          body: [
            [
              headerCell("Subject"),
              headerCell("Assessment"),
              headerCell("Marks", true),
              headerCell("%", true),
              headerCell("Grade", true),
            ],
            ...data.subjects.map((subject): TableCell[] => {
              const percent = percentage(subject.marksObtained, subject.maxMarks);
              return [
                { text: subject.subject },
                { text: subject.examType, color: "#6B6684" },
                rightCell(`${subject.marksObtained} / ${subject.maxMarks}`),
                rightCell(`${percent}%`),
                rightCell(gradeLetter(percent), true),
              ];
            }),
            [
              { text: "Overall", bold: true },
              { text: "" },
              rightCell(`${totalObtained} / ${totalMax}`, true),
              rightCell(`${overall}%`, true),
              rightCell(gradeLetter(overall), true),
            ],
          ],
        },
        layout: tableLayout,
      },

      { text: "Summary", style: "heading" },
      fieldRow([
        {
          label: "Attendance",
          value: data.attendanceRate === null ? "Not recorded" : `${data.attendanceRate}%`,
        },
        {
          label: "Position in class",
          value: data.position === null ? "Not ranked" : `${data.position} of ${data.classSize}`,
        },
        { label: "Overall grade", value: gradeLetter(overall) },
      ]),

      // Teacher remarks are per subject, so they're listed rather than merged
      // into one paragraph that would read as though one person wrote it.
      ...(data.subjects.some((s) => s.comments)
        ? [
            { text: "Teacher remarks", style: "heading" as const },
            {
              ul: data.subjects
                .filter((s) => s.comments)
                .map((s) => ({ text: `${s.subject}: ${s.comments}` })),
              margin: [0, 0, 0, 6] as [number, number, number, number],
            },
          ]
        : []),

      footer(
        `Generated ${new Date().toLocaleDateString("en-GB")}. This is a computer-generated document and needs no signature.`,
      ),
    ],
    styles: documentStyles,
  };
}
