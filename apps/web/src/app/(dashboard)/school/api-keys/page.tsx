"use client";

import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@skolara/api-client";
import { Badge, Button, Card, CardHeader, CardTitle, EmptyState, Input, PageHeader } from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ApiKeysPage() {
  const { data: apiKeys, isLoading } = useApiKeys();
  const { t, locale } = useTranslation();
  const createApiKey = useCreateApiKey();
  const revokeApiKey = useRevokeApiKey();

  const [name, setName] = useState("");
  const [rawKey, setRawKey] = useState<string>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await createApiKey.mutateAsync({ name });
    setRawKey(result.rawKey);
    setName("");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("apiKeys.title")}
        description={t("apiKeys.description")}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("apiKeys.usingAKey")}</CardTitle>
        </CardHeader>
        <p className="text-sm text-slate-500">
          Send the key as an <code className="text-xs">x-api-key</code> header. Keys are
          scoped to this school and are <strong>read-only</strong> — they can fetch
          students, classes, attendance, grades, invoices, and analytics, but any write
          is rejected. Use a signed-in account for changes so the action is attributable
          to a person.
        </p>
        <code className="mt-3 block overflow-x-auto rounded bg-slate-100 px-3 py-2 text-xs dark:bg-slate-900">
          curl -H &quot;x-api-key: sk_skolara_...&quot; {apiBaseUrl}/students
        </code>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("apiKeys.createKey")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <Input
            placeholder={t("apiKeys.nameHint")}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" disabled={createApiKey.isPending}>
            {createApiKey.isPending ? t("apiKeys.creating") : t("apiKeys.create")}
          </Button>
        </form>
        {rawKey && (
          <div className="mt-4 rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm dark:border-warning-700 dark:bg-warning-900/20">
            <p className="font-medium">{t("apiKeys.copyNow")}</p>
            <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs dark:bg-slate-950">
              {rawKey}
            </code>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("apiKeys.title")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {apiKeys?.length === 0 && (
          <EmptyState title={t("apiKeys.noKeys")} description={t("apiKeys.noKeysBody")} />
        )}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {apiKeys?.map((key) => (
            <div key={key.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{key.name}</p>
                <p className="text-sm text-slate-500">
                  {t("apiKeys.keyMeta", {
                    prefix: key.keyPrefix,
                    created: new Date(key.createdAt).toLocaleDateString(intlLocale(locale)),
                  })}
                  {key.lastUsedAt
                    ? t("apiKeys.lastUsed", {
                        date: new Date(key.lastUsedAt).toLocaleDateString(intlLocale(locale)),
                      })
                    : t("apiKeys.neverUsed")}
                </p>
              </div>
              {key.revokedAt ? (
                <Badge tone="danger">{t("apiKeys.revoked")}</Badge>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => revokeApiKey.mutate(key.id)}
                  disabled={revokeApiKey.isPending}
                >
                  {t("apiKeys.revoke")}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
