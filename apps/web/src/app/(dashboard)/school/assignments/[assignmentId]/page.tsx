"use client";

import { useAssignmentSubmissions, useGradeAssignment } from "@skolara/api-client";
import { Button, Card, CardHeader, CardTitle, EmptyState, Input } from "@skolara/ui";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function AssignmentSubmissionsPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { data: submissions, isLoading } = useAssignmentSubmissions(assignmentId);
  const gradeAssignment = useGradeAssignment();
  const [grades, setGrades] = useState<Record<string, string>>({});

  async function submitGrade(submissionId: string) {
    const grade = grades[submissionId];
    if (!grade) return;
    await gradeAssignment.mutateAsync({ submissionId, input: { grade } });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submissions</CardTitle>
      </CardHeader>
      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {submissions?.length === 0 && <EmptyState title="No submissions yet" />}
      <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
        {submissions?.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">
                {s.student.user.firstName} {s.student.user.lastName}
              </p>
              <a
                href={s.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-brand-700 underline"
              >
                View submission
              </a>
              {s.note && <p className="text-sm italic text-slate-500">{s.note}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder={s.grade ?? "Grade"}
                value={grades[s.id] ?? ""}
                onChange={(e) =>
                  setGrades((prev) => ({ ...prev, [s.id]: e.target.value }))
                }
                className="w-24"
              />
              <Button variant="secondary" onClick={() => submitGrade(s.id)}>
                Save
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
