"use client";

import { useClasses, useCreateNotice, useMySchool, useNotices } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { NoticeAudience } from "@skolara/types";
import { Badge, Button, Card, CardTitle, EmptyState, Input, Select, Skeleton, cn } from "@skolara/ui";
import { useState, type FormEvent } from "react";
import { intlLocale } from "@/lib/intl";
import { classLabel } from "../home-helpers";

const AUDIENCES: NoticeAudience[] = ["ALL", "PARENTS", "STUDENTS", "TEACHERS", "CLASS"];
const TITLE_MAX = 120;
const BODY_MAX = 1000;

type FieldError = "title" | "body" | "class";

/**
 * Notices go out inside Skolara only: a notification on the phone and an
 * entry in each person's inbox. The page says so plainly, because a school
 * needs to know nothing is being texted on its behalf.
 */
export default function NoticesPage() {
  const { t, locale } = useTranslation();
  const notices = useNotices();
  const classes = useClasses();
  const school = useMySchool();
  const createNotice = useCreateNotice();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<NoticeAudience>("ALL");
  const [classId, setClassId] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const classNames = new Map(
    (classes.data ?? []).map((c) => [c.id, classLabel(c.name, c.section ?? null)]),
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: FieldError[] = [];
    if (!title.trim()) found.push("title");
    if (!body.trim()) found.push("body");
    if (audience === "CLASS" && !classId) found.push("class");
    setErrors(found);
    setStatus(null);
    if (found.length > 0) return;
    createNotice.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        audience,
        classId: audience === "CLASS" ? classId : undefined,
      },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
          setStatus({ tone: "ok", text: t("notices.published") });
        },
        onError: () => setStatus({ tone: "error", text: t("common.somethingWentWrong") }),
      },
    );
  }

  const label = "mb-1 block text-sm font-bold text-slate-900 dark:text-slate-50";
  const errorText = "mt-1 text-sm font-bold text-red-700 dark:text-red-400";
  const formatDate = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{t("notices.title")}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("notices.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle>{t("notices.newNotice")}</CardTitle>
          <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="notice-title" className={label}>{t("notices.noticeTitle")}</label>
              <Input
                id="notice-title"
                maxLength={TITLE_MAX}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("notices.noticeTitlePlaceholder")}
                aria-invalid={errors.includes("title")}
                aria-describedby={errors.includes("title") ? "notice-title-error" : undefined}
              />
              {errors.includes("title") && <p id="notice-title-error" className={errorText}>{t("notices.titleRequired")}</p>}
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="notice-body" className={label}>{t("notices.message")}</label>
                <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">{body.length}/{BODY_MAX}</span>
              </div>
              <textarea
                id="notice-body"
                rows={5}
                maxLength={BODY_MAX}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("notices.messagePlaceholder")}
                aria-invalid={errors.includes("body")}
                aria-describedby={errors.includes("body") ? "notice-body-error" : undefined}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              />
              {errors.includes("body") && <p id="notice-body-error" className={errorText}>{t("notices.messageRequired")}</p>}
            </div>
            <fieldset>
              <legend className={label}>{t("notices.sendTo")}</legend>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map((a) => (
                  <label
                    key={a}
                    className={cn(
                      "flex min-h-[2.75rem] cursor-pointer items-center rounded-xl border px-4 text-sm font-bold transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-brand-700",
                      audience === a
                        ? "border-brand-700 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-100"
                        : "border-slate-300 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300",
                    )}
                  >
                    <input type="radio" name="audience" value={a} checked={audience === a} onChange={() => setAudience(a)} className="sr-only" />
                    {t(`noticeAudience.${a}`)}
                  </label>
                ))}
              </div>
            </fieldset>
            {audience === "CLASS" && (
              <div className="max-w-xs">
                <label htmlFor="notice-class" className={label}>{t("notices.whichClass")}</label>
                <Select
                  id="notice-class"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  aria-invalid={errors.includes("class")}
                  aria-describedby={errors.includes("class") ? "notice-class-error" : undefined}
                >
                  <option value="">{t("notices.chooseClass")}</option>
                  {(classes.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{classLabel(c.name, c.section ?? null)}</option>
                  ))}
                </Select>
                {errors.includes("class") && <p id="notice-class-error" className={errorText}>{t("notices.classRequired")}</p>}
              </div>
            )}
            <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              {t("notices.deliveryNote")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={createNotice.isPending}>
                {createNotice.isPending ? t("notices.sending") : t("notices.publish")}
              </Button>
              <p role="status" aria-live="polite" className={cn("text-sm font-bold", status?.tone === "error" ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
                {status?.text}
              </p>
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>{t("notices.preview")}</CardTitle>
          <div aria-hidden className="mx-auto mt-4 max-w-xs rounded-[1.75rem] border-[6px] border-slate-800 bg-slate-100 p-3 dark:bg-slate-800">
            <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-xs font-extrabold text-white">
                {(school.data?.name ?? "S").split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-600 dark:text-slate-400">{school.data?.name ?? "Skolara"}</p>
                <p className="break-words text-sm font-extrabold text-slate-900 dark:text-slate-50">{title.trim() || t("notices.previewTitleFallback")}</p>
                <p className="line-clamp-3 break-words text-sm text-slate-700 dark:text-slate-300">{body.trim() || t("notices.previewBodyFallback")}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>{t("notices.recent")}</CardTitle>
        {notices.isError ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{t("notices.loadError")}</p>
            <Button variant="secondary" onClick={() => void notices.refetch()}>{t("common.retry")}</Button>
          </div>
        ) : !notices.data ? (
          <div className="mt-4 flex flex-col gap-3" aria-busy>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : notices.data.length === 0 ? (
          <EmptyState title={t("notices.emptyTitle")} description={t("notices.emptyBody")} />
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {notices.data.map((notice) => (
              <li key={notice.id} className="py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-extrabold text-slate-900 dark:text-slate-50">{notice.title}</p>
                  <Badge tone="info">
                    {notice.audience === "CLASS" && notice.classId && classNames.has(notice.classId)
                      ? classNames.get(notice.classId)
                      : t(`noticeAudience.${notice.audience}`)}
                  </Badge>
                  <span className="ms-auto text-xs text-slate-600 dark:text-slate-400">{formatDate.format(new Date(notice.createdAt))}</span>
                </div>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700 dark:text-slate-300">{notice.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
