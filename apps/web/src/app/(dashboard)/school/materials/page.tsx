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
import { useTranslation } from "@skolara/i18n";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { intlLocale } from "@/lib/intl";

const ACCEPT = allowedMimeTypesFor("STUDY_MATERIAL").join(",");

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function StudyMaterialsPage() {
  const api = useApiClient();
  const { t, locale } = useTranslation();
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
      setError(err instanceof Error ? err.message : t("materials.couldNotPublish"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("materials.title")}
        description={t("materials.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("materials.publishFile")}</CardTitle>
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
            <option value="">{t("fields.selectClass")}</option>
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
              placeholder={t("fields.subject")}
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="max-w-[180px]"
            />
            <Input
              placeholder={t("fields.title")}
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
            placeholder={t("materials.descriptionHint")}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy || !classId || !file}>
              {upload.isPending
                ? t("materials.uploading")
                : publish.isPending
                  ? t("materials.publishing")
                  : t("materials.publish")}
            </Button>
            {!classId && <p className="text-sm text-slate-500">{t("materials.pickClassFirst")}</p>}
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("materials.classLibrary")}</CardTitle>
        </CardHeader>

        {subjects.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              variant={subjectFilter ? "ghost" : "secondary"}
              onClick={() => setSubjectFilter("")}
            >
              {t("common.all")}
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

        {!classId && <p className="text-sm text-slate-500">{t("materials.selectClassForLibrary")}</p>}
        {classId && isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {classId && !isLoading && visible.length === 0 && (
          <EmptyState
            icon="📚"
            title={t("materials.nothingPublished")}
            description={t("materials.nothingPublishedBody")}
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
                  {t("materials.fileMeta", {
                    size: fileSize(material.sizeBytes),
                    uploader: `${material.uploadedByUser.firstName} ${material.uploadedByUser.lastName}`,
                    date: new Date(material.createdAt).toLocaleDateString(intlLocale(locale), {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                className="shrink-0"
                onClick={() => withdraw.mutate(material.id)}
              >
                {t("materials.withdraw")}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
