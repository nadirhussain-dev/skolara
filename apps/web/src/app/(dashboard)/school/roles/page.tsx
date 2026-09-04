"use client";

import {
  useAssignRoleTemplate,
  useCapabilityCatalogue,
  useCreateRoleTemplate,
  useDeleteRoleTemplate,
  useRoleTemplates,
  useUpdateRoleTemplate,
} from "@skolara/api-client";
import { useApiClient } from "@skolara/api-client";
import type { TemplatableRole, User } from "@skolara/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "@skolara/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

const ROLE_LABELS: Record<TemplatableRole, string> = {
  SCHOOL_ADMIN: "School admin",
  TEACHER: "Teacher",
  PARENT: "Parent",
  STUDENT: "Student",
};

export default function RoleTemplatesPage() {
  const api = useApiClient();
  const { data: catalogue } = useCapabilityCatalogue();
  const { data: templates } = useRoleTemplates();
  const { data: users } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.users.list(),
  });

  const create = useCreateRoleTemplate();
  const update = useUpdateRoleTemplate();
  const remove = useDeleteRoleTemplate();
  const assign = useAssignRoleTemplate();

  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState("");
  const [baseRole, setBaseRole] = useState<TemplatableRole>("SCHOOL_ADMIN");
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const editing = templates?.find((template) => template.id === editingId);

  function toggle(capability: string) {
    setPermissions((current) => {
      const next = new Set(current);
      if (next.has(capability)) next.delete(capability);
      else next.add(capability);
      return next;
    });
  }

  function toggleResource(resource: string, on: boolean) {
    setPermissions((current) => {
      const next = new Set(current);
      for (const action of ["read", "write"]) {
        const capability = `${resource}:${action}`;
        if (on) next.add(capability);
        else next.delete(capability);
      }
      return next;
    });
  }

  function startNew() {
    setEditingId(undefined);
    setName("");
    setBaseRole("SCHOOL_ADMIN");
    setPermissions(new Set());
    setError("");
  }

  function startEdit(id: string) {
    const template = templates?.find((candidate) => candidate.id === id);
    if (!template) return;
    setEditingId(id);
    setName(template.name);
    setBaseRole(template.baseRole as TemplatableRole);
    setPermissions(new Set(template.permissions));
    setError("");
  }

  function applyPreset(presetName: string) {
    const preset = catalogue?.presets.find((candidate) => candidate.name === presetName);
    if (!preset) return;
    setName(preset.name);
    setBaseRole(preset.baseRole);
    setPermissions(new Set(preset.permissions));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const input = { name, baseRole, permissions: [...permissions] };
    try {
      if (editingId) await update.mutateAsync({ id: editingId, input });
      else await create.mutateAsync(input);
      startNew();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that template");
    }
  }

  // Only accounts whose role matches a template can hold one — the API
  // refuses the rest, so offering them would be a dead end.
  const assignable = useMemo(
    () => (users ?? []).filter((user) => user.role !== "SUPER_ADMIN"),
    [users],
  );
  const templatesByRole = useMemo(() => {
    const map = new Map<string, typeof templates>();
    for (const template of templates ?? []) {
      map.set(template.baseRole, [...(map.get(template.baseRole) ?? []), template]);
    }
    return map;
  }, [templates]);

  const selectedCount = permissions.size;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles & permissions"
        description="Narrow what someone can reach, without inventing a new role. An accountant is a school admin who only sees fees."
      />

      <Card>
        {/* Said up front, because the mental model matters more than the UI:
            a template subtracts, it never adds. */}
        <p className="text-sm text-slate-500">
          A template <span className="font-medium text-slate-700 dark:text-slate-200">removes</span>{" "}
          access from an account. It can never grant something the person&apos;s role doesn&apos;t
          already have, so the worst a mistake here does is lock somebody out — and anyone holding
          a template can&apos;t reach this page, which is why you can&apos;t put one on your own
          account.
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? `Editing “${editing.name}”` : "New template"}</CardTitle>
        </CardHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Name
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-[220px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Based on
              <Select
                value={baseRole}
                onChange={(e) => setBaseRole(e.target.value as TemplatableRole)}
                className="max-w-[180px]"
                disabled={Boolean(editing && editing._count.users > 0)}
              >
                {catalogue?.templatableRoles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role as TemplatableRole]}
                  </option>
                ))}
              </Select>
            </label>
            {!editing && (
              <label className="flex flex-col gap-1 text-sm">
                Start from
                <Select
                  defaultValue=""
                  onChange={(e) => applyPreset(e.target.value)}
                  className="max-w-[220px]"
                >
                  <option value="">Blank</option>
                  {catalogue?.presets.map((preset) => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name}
                    </option>
                  ))}
                </Select>
              </label>
            )}
          </div>

          {editing && editing._count.users > 0 && (
            <p className="text-sm text-slate-500">
              {editing._count.users} {editing._count.users === 1 ? "person is" : "people are"} on
              this template, so its base role is fixed until they&apos;re unassigned.
            </p>
          )}

          <div className="flex flex-col gap-4">
            {catalogue?.groups.map((group) => (
              <div key={group.group}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {group.group}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.resources.map((resource) => {
                    const canRead = permissions.has(`${resource}:read`);
                    const canWrite = permissions.has(`${resource}:write`);
                    return (
                      <div
                        key={resource}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                      >
                        <button
                          type="button"
                          onClick={() => toggleResource(resource, !(canRead && canWrite))}
                          className="truncate text-left text-sm hover:underline"
                          title="Toggle both"
                        >
                          {resource.replace(/-/g, " ")}
                        </button>
                        <div className="flex shrink-0 gap-3 text-xs">
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={canRead}
                              onChange={() => toggle(`${resource}:read`)}
                            />
                            view
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={canWrite}
                              onChange={() => toggle(`${resource}:write`)}
                            />
                            change
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editing ? "Save changes" : "Create template"}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={startNew}>
                Cancel
              </Button>
            )}
            <p className="text-sm text-slate-500">
              {selectedCount} capabilit{selectedCount === 1 ? "y" : "ies"} selected
            </p>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        {templates?.length === 0 && (
          <EmptyState
            icon="🔑"
            title="No templates yet."
            description="Build one above, or start from a preset."
          />
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {templates?.map((template) => (
            <li
              key={template.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{template.name}</p>
                  <Badge tone="neutral">
                    {ROLE_LABELS[template.baseRole as TemplatableRole] ?? template.baseRole}
                  </Badge>
                  <Badge tone={template._count.users > 0 ? "info" : "neutral"}>
                    {template._count.users} assigned
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {template.permissions.length} capabilit
                  {template.permissions.length === 1 ? "y" : "ies"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="secondary" onClick={() => startEdit(template.id)}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => remove.mutate(template.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {(templates?.length ?? 0) > 0 && (
          <p className="mt-3 text-sm text-slate-400">
            Deleting a template returns whoever held it to their unrestricted role.
          </p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Who has one</CardTitle>
        </CardHeader>
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {assignable.map((user) => {
            const options = templatesByRole.get(user.role) ?? [];
            return (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {user.email} · {ROLE_LABELS[user.role as TemplatableRole] ?? user.role}
                  </p>
                </div>
                <Select
                  value={user.roleTemplateId ?? ""}
                  className="max-w-[240px] shrink-0"
                  disabled={options.length === 0}
                  onChange={(e) =>
                    assign.mutate({
                      userId: user.id,
                      input: { roleTemplateId: e.target.value || null },
                    })
                  }
                >
                  <option value="">
                    {options.length === 0 ? "No template for this role" : "Unrestricted"}
                  </option>
                  {options.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
