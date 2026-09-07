"use client";

import {
  useCreateNotice,
  useMySchool,
  useNotices,
  useUpdateCommunication,
} from "@skolara/api-client";
import { phoneChannelSchema, type NoticeAudience, type PhoneChannel } from "@skolara/types";
import { Badge, Button, Card, CardHeader, CardTitle, Input } from "@skolara/ui";
import { useTranslation, type MessageKey, type Translate } from "@skolara/i18n";
import { useState } from "react";

const audiences: NoticeAudience[] = ["ALL", "TEACHERS", "PARENTS", "STUDENTS"];

/** Names the channels a publish will actually use, rather than assuming. */
function publishLabel(channel: PhoneChannel | undefined): MessageKey {
  if (channel === "SMS") return "notices.publishSms";
  if (channel === "BOTH") return "notices.publishBoth";
  return "notices.publishWhatsApp";
}

/** The channel choices, named for whoever is reading them. */
function channelLabel(channel: PhoneChannel, t: Translate): string {
  if (channel === "SMS") return t("communication.smsOnly");
  if (channel === "BOTH") return t("communication.both");
  return t("communication.whatsappOnly");
}

export default function NoticesPage() {
  const { t } = useTranslation();
  const { data: notices, isLoading } = useNotices();
  const { data: school } = useMySchool();
  const createNotice = useCreateNotice();
  const updateCommunication = useUpdateCommunication();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<NoticeAudience>("ALL");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createNotice.mutateAsync({ title, body, audience });
    setTitle("");
    setBody("");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("notices.alertChannel")}</CardTitle>
        </CardHeader>
        <p className="text-sm text-slate-500">{t("notices.alertChannelBody")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {phoneChannelSchema.options.map((channel) => {
            const active = school?.phoneChannel === channel;
            return (
              <button
                key={channel}
                type="button"
                aria-pressed={active}
                disabled={!school || updateCommunication.isPending}
                onClick={() =>
                  school &&
                  updateCommunication.mutate({ id: school.id, input: { phoneChannel: channel } })
                }
                className={
                  active
                    ? "rounded-lg border border-brand-600 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                    : "rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-slate-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                }
              >
                {channelLabel(channel, t)}
              </button>
            );
          })}
        </div>
        {school && school.phoneChannel !== "WHATSAPP" && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
            {t("notices.smsCharged")}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("notices.broadcast")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            placeholder={t("fields.title")}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder={t("fields.message")}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as NoticeAudience)}
            className="max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {audiences.map((a) => (
              <option key={a} value={a}>
                {t(`noticeAudience.${a}`)}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={createNotice.isPending} className="self-start">
            {createNotice.isPending ? t("notices.sending") : t(publishLabel(school?.phoneChannel))}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("notices.recent")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {notices?.map((notice) => (
            <div key={notice.id} className="py-3">
              <div className="flex items-center gap-2">
                <p className="font-medium">{notice.title}</p>
                <Badge tone="info">{t(`noticeAudience.${notice.audience}`)}</Badge>
              </div>
              <p className="text-sm text-slate-500">{notice.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
