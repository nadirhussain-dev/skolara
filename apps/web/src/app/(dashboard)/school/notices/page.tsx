"use client";

import {
  useCreateNotice,
  useMySchool,
  useNotices,
  useUpdateCommunication,
} from "@skolara/api-client";
import {
  PHONE_CHANNEL_LABELS,
  phoneChannelSchema,
  type NoticeAudience,
  type PhoneChannel,
} from "@skolara/types";
import { Badge, Button, Card, CardHeader, CardTitle, Input } from "@skolara/ui";
import { useState } from "react";

const audiences: NoticeAudience[] = ["ALL", "TEACHERS", "PARENTS", "STUDENTS"];

/** Names the channels a publish will actually use, rather than assuming. */
function publishLabel(channel: PhoneChannel | undefined): string {
  if (channel === "SMS") return "Publish + notify by SMS";
  if (channel === "BOTH") return "Publish + notify by WhatsApp and SMS";
  return "Publish + notify via WhatsApp";
}

export default function NoticesPage() {
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
          <CardTitle>How alerts reach parents</CardTitle>
        </CardHeader>
        <p className="text-sm text-slate-500">
          Applies to notices, fee updates and absence alerts. Push notifications go to
          everyone with the app either way.
        </p>
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
                {PHONE_CHANNEL_LABELS[channel]}
              </button>
            );
          })}
        </div>
        {school && school.phoneChannel !== "WHATSAPP" && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
            SMS is charged per message by your provider. WhatsApp is not.
          </p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Broadcast a notice</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            placeholder="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Message"
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
                {a}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={createNotice.isPending} className="self-start">
            {createNotice.isPending ? "Sending..." : publishLabel(school?.phoneChannel)}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent notices</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {notices?.map((notice) => (
            <div key={notice.id} className="py-3">
              <div className="flex items-center gap-2">
                <p className="font-medium">{notice.title}</p>
                <Badge tone="info">{notice.audience}</Badge>
              </div>
              <p className="text-sm text-slate-500">{notice.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
