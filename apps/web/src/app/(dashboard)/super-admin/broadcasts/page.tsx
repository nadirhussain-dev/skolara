"use client";

import {
  useAllBroadcasts,
  useCreateBroadcast,
  useWithdrawBroadcast,
} from "@skolara/api-client";
import { roleSchema, type RoleType } from "@skolara/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  Textarea,
} from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";

export default function BroadcastsPage() {
  const { t, locale } = useTranslation();
  const { data: broadcasts, isLoading } = useAllBroadcasts();
  const create = useCreateBroadcast();
  const withdraw = useWithdrawBroadcast();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");

  function toggleRole(role: RoleType) {
    setRoles((current) =>
      current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await create.mutateAsync({
        title,
        body,
        audienceRoles: roles,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });
      setTitle("");
      setBody("");
      setRoles([]);
      setExpiresAt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("broadcasts.couldNotSend"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("broadcasts.title")}
        description={t("broadcasts.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("broadcasts.compose")}</CardTitle>
        </CardHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input
            placeholder={t("fields.title")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
          />
          <Textarea
            placeholder={t("broadcasts.bodyHint")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            required
          />

          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="mb-1 w-full text-sm text-slate-500">
              {t("broadcasts.audienceLegend")}
            </legend>
            {roleSchema.options.map((role) => (
              <label
                key={role}
                className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-sm dark:border-slate-800"
              >
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={() => toggleRole(role)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {t(`roles.${role}`)}
              </label>
            ))}
          </fieldset>

          <label className="flex max-w-xs flex-col gap-1 text-sm">
            {t("broadcasts.expiresLabel")}
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </label>

          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? t("broadcasts.sending") : t("broadcasts.send")}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("broadcasts.sent")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {!isLoading && broadcasts?.length === 0 && <EmptyState title={t("broadcasts.nothingSent")} />}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {broadcasts?.map((broadcast) => {
            const expired = broadcast.expiresAt && new Date(broadcast.expiresAt) < new Date();
            return (
              <li key={broadcast.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-medium">{broadcast.title}</p>
                  <p className="text-sm text-slate-500">{broadcast.body}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {broadcast.audienceRoles.length === 0
                      ? t("broadcasts.everyone")
                      : broadcast.audienceRoles.map((role) => t(`roles.${role}`)).join(", ")}
                    {broadcast.expiresAt
                      ? t(expired ? "broadcasts.expiredOn" : "broadcasts.expiresOn", {
                          date: new Date(broadcast.expiresAt).toLocaleString(intlLocale(locale)),
                        })
                      : t("broadcasts.noExpiry")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {expired && <Badge tone="neutral">{t("broadcasts.expiredBadge")}</Badge>}
                  <Button variant="ghost" onClick={() => withdraw.mutate(broadcast.id)}>
                    {t("broadcasts.withdraw")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
