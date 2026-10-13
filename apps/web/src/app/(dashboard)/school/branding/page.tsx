"use client";

import { useMySchool, useUpdateBranding, useUploadFile } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { School } from "@skolara/types";
import { Button, Card, CardTitle, Input, Skeleton, cn } from "@skolara/ui";
import { DEFAULT_BRAND_COLOR, brandScale, isHexColor, rgbToHex, safeBrandColor } from "@skolara/utils";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Field, PageTitle } from "@/components/ui-kit";
import { safeHttpUrl } from "@/lib/safe-url";

/** Colours that already pass contrast with white text. The first is the Skolara default. */
const PRESETS = [DEFAULT_BRAND_COLOR, "#0F766E", "#1D4ED8", "#9F1239", "#166534", "#6D28D9", "#9A3412", "#334155"];

function initials(name: string) {
  return name.split(/\s+/).map((word) => word[0] ?? "").join("").slice(0, 2).toUpperCase();
}

/** A small picture of the sidebar and the phone sign-in, drawn in the colour being chosen. */
function Preview({ name, color, logo }: { name: string; color: string; logo: string | null }) {
  const { t } = useTranslation();
  const scale = brandScale(color);
  const c = (step: 50 | 700 | 900) => rgbToHex(scale[step]);
  const mark = logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" className="h-8 w-8 rounded-md bg-white object-contain" />
  ) : (
    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-xs font-extrabold" style={{ color: c(700) }}>{initials(name)}</span>
  );
  return (
    <div aria-hidden className="flex flex-wrap items-end gap-4">
      <div className="flex h-56 w-72 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex w-28 flex-col gap-1.5 p-2.5" style={{ backgroundColor: c(900) }}>
          <div className="mb-1 flex items-center gap-1.5">
            <span className="scale-75">{mark}</span>
            <span className="truncate text-[0.6rem] font-extrabold text-white">{name}</span>
          </div>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("rounded px-2 py-1.5 text-[0.6rem] font-bold", i === 1 ? "bg-white/15 text-white" : "text-white/70")}>
              {i === 1 ? t("branding.previewNav") : " "}
            </span>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2 bg-slate-50 p-3 dark:bg-slate-950">
          <div className="h-3 w-20 rounded bg-slate-300 dark:bg-slate-700" />
          <div className="h-12 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
          <span className="self-start rounded-md px-3 py-1.5 text-[0.65rem] font-bold text-white" style={{ backgroundColor: c(700) }}>{t("branding.previewButton")}</span>
          <span className="self-start rounded-md px-3 py-1.5 text-[0.65rem] font-bold" style={{ backgroundColor: c(50), color: c(700) }}>{t("branding.previewButton")}</span>
        </div>
      </div>
      <div className="flex h-56 w-32 flex-col overflow-hidden rounded-[1.25rem] border-[5px] border-slate-800">
        <div className="flex flex-col items-center gap-1 px-2 py-3" style={{ backgroundColor: c(900) }}>
          {mark}
          <span className="text-center text-[0.55rem] font-extrabold leading-tight text-white">{name}</span>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 rounded-t-xl bg-white p-2 dark:bg-slate-900">
          <div className="h-4 rounded border border-slate-300 dark:border-slate-600" />
          <div className="h-4 rounded border border-slate-300 dark:border-slate-600" />
          <span className="rounded py-1 text-center text-[0.55rem] font-bold text-white" style={{ backgroundColor: c(700) }}>{t("branding.previewSignIn")}</span>
        </div>
      </div>
    </div>
  );
}

function BrandingForm({ school }: { school: School }) {
  const { t } = useTranslation();
  const update = useUpdateBranding();
  const upload = useUploadFile();
  const fileInput = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(school.logoUrl ?? "");
  const [color, setColor] = useState(school.primaryColor ?? DEFAULT_BRAND_COLOR);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const valid = isHexColor(color);
  const effective = valid ? safeBrandColor(color) : DEFAULT_BRAND_COLOR;
  const adjusted = valid && effective.toLowerCase() !== color.toLowerCase();
  const logo = logoUrl ? safeHttpUrl(logoUrl) : null;
  const names = t("branding.colorNames").split(",");

  async function pickLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Lets the same file be picked again after a failed upload.
    event.target.value = "";
    if (!file) return;
    setMessage(null);
    try {
      const uploaded = await upload.mutateAsync({ file, purpose: "SCHOOL_LOGO" });
      setLogoUrl(uploaded.url);
    } catch {
      setMessage({ tone: "error", text: t("branding.uploadFailed") });
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) {
      setMessage({ tone: "error", text: t("branding.invalidColor") });
      return;
    }
    setMessage(null);
    update.mutate(
      { id: school.id, input: { logoUrl: logo ?? undefined, primaryColor: color.toUpperCase() } },
      {
        onSuccess: () => setMessage({ tone: "ok", text: t("branding.saved") }),
        onError: () => setMessage({ tone: "error", text: t("common.somethingWentWrong") }),
      },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Card className="flex flex-col gap-6 xl:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{t("branding.schoolCode")}</p>
            <p className="font-mono text-xl font-extrabold text-slate-900 dark:text-slate-50">{school.subdomain}</p>
          </div>
          <p className="max-w-xs text-sm text-slate-600 dark:text-slate-400">{t("branding.schoolCodeHelp")}</p>
        </div>

        <div>
          <p className="mb-1 text-sm font-bold text-slate-900 dark:text-slate-50">{t("branding.logo")}</p>
          <div className="flex flex-wrap items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={t("branding.logoPreviewAlt")} className="h-16 w-16 rounded-xl border border-slate-200 bg-white object-contain dark:border-slate-700" />
            ) : (
              <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-700 text-xl font-extrabold text-white">{initials(school.name)}</span>
            )}
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={pickLogo} className="sr-only" tabIndex={-1} aria-hidden />
            <Button type="button" variant="secondary" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
              {upload.isPending ? t("branding.uploading") : t("branding.chooseFile")}
            </Button>
            {logoUrl && <Button type="button" variant="ghost" onClick={() => setLogoUrl("")}>{t("branding.removeLogo")}</Button>}
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t("branding.logoHelp")}</p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-50">{t("branding.presets")}</legend>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset, index) => {
              const selected = color.toLowerCase() === preset.toLowerCase();
              return (
                <label key={preset} className={cn("flex min-h-[2.75rem] cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-bold focus-within:outline focus-within:outline-2 focus-within:outline-brand-700", selected ? "border-slate-900 dark:border-white" : "border-slate-300 dark:border-slate-700")}>
                  <input type="radio" name="preset" className="sr-only" checked={selected} onChange={() => setColor(preset)} />
                  <span aria-hidden className="h-5 w-5 rounded-full" style={{ backgroundColor: preset }} />
                  {names[index] ?? preset}
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field
          label={t("branding.custom")}
          help={adjusted ? t("branding.adjusted", { color: effective.toUpperCase() }) : t("branding.customHelp")}
          error={valid ? null : t("branding.invalidColor")}
          className="max-w-xs"
        >
          {(props) => (
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={t("branding.primaryColor")}
                value={valid ? color : DEFAULT_BRAND_COLOR}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
              />
              <Input {...props} maxLength={7} autoComplete="off" spellCheck={false} value={color} onChange={(e) => setColor(e.target.value.trim())} className="font-mono uppercase" />
            </div>
          )}
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={update.isPending || upload.isPending}>{update.isPending ? t("branding.saving") : t("branding.save")}</Button>
          <p role="status" aria-live="polite" className={cn("text-sm font-bold", message?.tone === "error" ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
            {message?.text}
          </p>
        </div>
      </Card>

      <Card className="self-start xl:col-span-2">
        <CardTitle>{t("branding.preview")}</CardTitle>
        <div className="mt-4"><Preview name={school.name} color={effective} logo={logo} /></div>
      </Card>
    </form>
  );
}

export default function BrandingPage() {
  const { t } = useTranslation();
  const school = useMySchool();
  return (
    <div className="flex flex-col gap-5">
      <PageTitle title={t("branding.title")} subtitle={t("branding.description")} />
      {school.isError ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{t("people.loadError")}</p>
          <Button variant="secondary" onClick={() => void school.refetch()}>{t("common.retry")}</Button>
        </Card>
      ) : !school.data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <BrandingForm key={school.data.id} school={school.data} />
      )}
    </div>
  );
}
