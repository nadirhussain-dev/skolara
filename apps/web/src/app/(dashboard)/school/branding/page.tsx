"use client";

import { useMySchool, useUpdateBranding } from "@skolara/api-client";
import { Button, Card, CardHeader, CardTitle, Input, PageHeader } from "@skolara/ui";
import { useEffect, useState } from "react";

export default function BrandingPage() {
  const { data: school, isLoading } = useMySchool();
  const updateBranding = useUpdateBranding();

  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6D28D9");
  const [savedMessage, setSavedMessage] = useState("");

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
    setSavedMessage("Branding updated.");
    setTimeout(() => setSavedMessage(""), 3000);
  }

  if (isLoading || !school) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Branding" description="White-label your school's login and dashboard." />
      <Card>
        <CardHeader>
          <CardTitle>{school.name}</CardTitle>
        </CardHeader>
        <p className="text-sm text-slate-500">
          {school.subdomain}.skolara.app · {school.plan} plan
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>White-labeling</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Logo URL
              <Input
                type="url"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="min-w-[280px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Primary color
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
              {updateBranding.isPending ? "Saving..." : "Save branding"}
            </Button>
          </div>
          {savedMessage && <p className="text-sm text-emerald-600">{savedMessage}</p>}
        </form>

        {logoUrl && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="School logo preview" className="h-12 w-12 rounded object-contain" />
            <span
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Preview
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
