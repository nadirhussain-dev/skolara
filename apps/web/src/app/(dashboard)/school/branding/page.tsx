"use client";

import { useMySchool, useUpdateBranding, useUploadFile } from "@skolara/api-client";
import { Button, Card, CardHeader, CardTitle, Input, PageHeader } from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import { useEffect, useState } from "react";

export default function BrandingPage() {
  const { t } = useTranslation();
  const { data: school, isLoading } = useMySchool();
  const updateBranding = useUpdateBranding();
  const uploadFile = useUploadFile();

  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6D28D9");
  const [savedMessage, setSavedMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    // Syncs local editable form fields from the fetched school record once
    // it arrives — can't be a lazy useState initializer since `school` isn't
    // available until the query resolves.
    if (school) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLogoUrl(school.logoUrl ?? "");
      setPrimaryColor(school.primaryColor ?? "#6D28D9");
    }
  }, [school]);

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    try {
      const uploaded = await uploadFile.mutateAsync({ file, purpose: "SCHOOL_LOGO" });
      setLogoUrl(uploaded.url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : t("branding.uploadFailed"));
    } finally {
      // Lets the same file be re-picked if the upload failed.
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!school) return;
    await updateBranding.mutateAsync({
      id: school.id,
      input: {
        logoUrl: logoUrl || undefined,
        primaryColor: primaryColor || undefined,
      },
    });
    setSavedMessage(t("branding.saved"));
    setTimeout(() => setSavedMessage(""), 3000);
  }

  if (isLoading || !school) {
    return <p className="text-sm text-slate-500">{t("common.loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("branding.title")} description={t("branding.description")} />
      <Card>
        <CardHeader>
          <CardTitle>{school.name}</CardTitle>
        </CardHeader>
        <p className="text-sm text-slate-500">
          {t("branding.schoolLine", { subdomain: school.subdomain, plan: school.plan })}
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("branding.whiteLabeling")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              {t("branding.logo")}
              <Input
                type="url"
                placeholder={t("branding.logoUrlHint")}
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="min-w-[280px]"
              />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoFile}
                disabled={uploadFile.isPending}
                className="mt-1 text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs dark:file:bg-slate-800 dark:file:text-slate-200"
              />
              {uploadFile.isPending && (
                <span className="text-xs text-slate-500">{t("branding.uploading")}</span>
              )}
              {uploadError && <span className="text-xs text-rose-600">{uploadError}</span>}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("branding.primaryColor")}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : "#6D28D9"}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-slate-300 dark:border-slate-700"
                />
                <Input
                  placeholder="#6D28D9"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="max-w-[140px]"
                />
              </div>
            </label>
            <Button type="submit" disabled={updateBranding.isPending}>
              {updateBranding.isPending ? t("branding.saving") : t("branding.save")}
            </Button>
          </div>
          {savedMessage && <p className="text-sm text-emerald-600">{savedMessage}</p>}
        </form>

        {logoUrl && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={t("branding.logoPreviewAlt")} className="h-12 w-12 rounded object-contain" />
            <span
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {t("branding.preview")}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
