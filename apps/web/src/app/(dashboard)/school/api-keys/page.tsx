"use client";

import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@skolara/api-client";
import { Badge, Button, Card, CardHeader, CardTitle, EmptyState, Input, PageHeader } from "@skolara/ui";
import { useState } from "react";

export default function ApiKeysPage() {
  const { data: apiKeys, isLoading } = useApiKeys();
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
        title="API keys"
        description="Create and revoke keys for third-party integrations."
      />
      <Card>
        <CardHeader>
          <CardTitle>Create an API key</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <Input
            placeholder="Key name (e.g. Reporting integration)"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" disabled={createApiKey.isPending}>
            {createApiKey.isPending ? "Creating..." : "Create key"}
          </Button>
        </form>
        {rawKey && (
          <div className="mt-4 rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm dark:border-warning-700 dark:bg-warning-900/20">
            <p className="font-medium">Copy this key now — it won&apos;t be shown again.</p>
            <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs dark:bg-slate-950">
              {rawKey}
            </code>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {apiKeys?.length === 0 && (
          <EmptyState title="No API keys yet" description="Create your first key above." />
        )}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {apiKeys?.map((key) => (
            <div key={key.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{key.name}</p>
                <p className="text-sm text-slate-500">
                  {key.keyPrefix}··· · Created {new Date(key.createdAt).toLocaleDateString()}
                  {key.lastUsedAt
                    ? ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                    : " · Never used"}
                </p>
              </div>
              {key.revokedAt ? (
                <Badge tone="danger">Revoked</Badge>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => revokeApiKey.mutate(key.id)}
                  disabled={revokeApiKey.isPending}
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
