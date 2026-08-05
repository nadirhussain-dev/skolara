"use client";

import { useCreateNotice, useNotices } from "@skolara/api-client";
import type { NoticeAudience } from "@skolara/types";
import { Badge, Button, Card, CardHeader, CardTitle, Input } from "@skolara/ui";
import { useState } from "react";

const audiences: NoticeAudience[] = ["ALL", "TEACHERS", "PARENTS", "STUDENTS"];

export default function NoticesPage() {
  const { data: notices, isLoading } = useNotices();
  const createNotice = useCreateNotice();
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
            {createNotice.isPending ? "Sending..." : "Publish + notify via WhatsApp"}
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
