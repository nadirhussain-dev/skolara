"use client";

import {
  useApiClient,
  useClassStudyMaterials,
  usePublishStudyMaterial,
  useUploadFile,
  useWithdrawStudyMaterial,
} from "@skolara/api-client";
import { allowedMimeTypesFor, type SchoolClass } from "@skolara/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@skolara/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

const ACCEPT = allowedMimeTypesFor("STUDY_MATERIAL").join(",");

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function StudyMaterialsPage() {
  const api = useApiClient();
  // Already scoped by the API: a teacher's class list is their own classes.
  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  const [classId, setClassId] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const { data: materials, isLoading } = useClassStudyMaterials(classId || undefined);

  const upload = useUploadFile();
  const publish = usePublishStudyMaterial();
  const withdraw = useWithdrawStudyMaterial();

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  // Filtering client-side: the whole class library is already in hand, and a
  // round-trip per tab click would be slower than the filter itself.
  const subjects = useMemo(
    () => [...new Set((materials ?? []).map((m) => m.subject))].sort(),
    [materials],
  );
  const visible = subjectFilter
    ? (materials ?? []).filter((m) => m.subject === subjectFilter)
    : (materials ?? []);

  const busy = upload.isPending || publish.isPending;

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!classId || !file) return;

    try {
      // Two steps by design: the file goes through the shared upload endpoint
      // so multipart handling lives in one place, and only the durable URL it
      // returns is recorded against the class.
      const uploaded = await upload.mutateAsync({ file, purpose: "STUDY_MATERIAL" });
      await publish.mutateAsync({
        classId,
        subject,
        title,
        description: description || undefined,
        fileKey: uploaded.key,
        fileUrl: uploaded.url,
        contentType: uploaded.contentType,
        sizeBytes: uploaded.sizeBytes,
      });
      setTitle("");
      setDescription("");
      setFile(null);
      // Subject stays put: a teacher uploading notes usually uploads several
      // for the same subject in a row.
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish that file");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Study materials"
        description="Notes, worksheets and past papers, published to a class. Students and parents read them in the app."
      />

      <Card>
        <CardHeader>
          <CardTitle>Publish a file</CardTitle>
        </CardHeader>
        <div className="mb-3">
          <Select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSubjectFilter("");
            }}
            className="max-w-xs"
          >
            <option value="">Select class</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.section}
              </option>
            ))}
          </Select>
        </div>

        <form onSubmit={handlePublish} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Subject"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="max-w-[180px]"
            />
            <Input
              placeholder="Title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="max-w-[260px]"
            />
            <input
              type="file"
              required
              accept={ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-slate-600 dark:text-slate-300"
            />
          </div>
          <Textarea
            placeholder="What is this, and what should they do with it? (optional)"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy || !classId || !file}>
              {upload.isPending ? "Uploading…" : publish.isPending ? "Publishing…" : "Publish"}
            </Button>
            {!classId && <p className="text-sm text-slate-500">Pick a class first.</p>}
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Class library</CardTitle>
        </CardHeader>

        {subjects.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              variant={subjectFilter ? "ghost" : "secondary"}
              onClick={() => setSubjectFilter("")}
            >
              All
            </Button>
            {subjects.map((s) => (
              <Button
                key={s}
                variant={subjectFilter === s ? "secondary" : "ghost"}
                onClick={() => setSubjectFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        )}

        {!classId && <p className="text-sm text-slate-500">Select a class to see its library.</p>}
        {classId && isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {classId && !isLoading && visible.length === 0 && (
          <EmptyState
            icon="📚"
            title="Nothing published yet."
            description="Files you publish here show up in the parent and student app straight away."
          />
        )}

        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {visible.map((material) => (
            <li key={material.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={material.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {material.title}
                  </a>
                  <Badge tone="neutral">{material.subject}</Badge>
                </div>
                {material.description && (
                  <p className="mt-1 text-sm text-slate-500">{material.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {fileSize(material.sizeBytes)} ·{" "}
                  {material.uploadedByUser.firstName} {material.uploadedByUser.lastName} ·{" "}
                  {new Date(material.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                className="shrink-0"
                onClick={() => withdraw.mutate(material.id)}
              >
                Withdraw
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
