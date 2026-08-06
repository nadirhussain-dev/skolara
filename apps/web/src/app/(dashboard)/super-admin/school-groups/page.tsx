"use client";

import {
  useAssignSchoolToGroup,
  useCreateSchoolGroup,
  useSchoolGroups,
  useSchools,
  useSchoolsInGroup,
} from "@skolara/api-client";
import { Button, Card, CardHeader, CardTitle, EmptyState, Input, Select } from "@skolara/ui";
import { useState } from "react";

export default function SchoolGroupsPage() {
  const { data: groups, isLoading } = useSchoolGroups();
  const { data: schools } = useSchools();
  const createGroup = useCreateSchoolGroup();
  const assignSchool = useAssignSchoolToGroup();

  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const { data: schoolsInGroup } = useSchoolsInGroup(groupId || undefined);
  const [assignSchoolId, setAssignSchoolId] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createGroup.mutateAsync({ name });
    setName("");
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId || !assignSchoolId) return;
    await assignSchool.mutateAsync({ groupId, input: { schoolId: assignSchoolId } });
    setAssignSchoolId("");
  }

  const availableSchools = schools?.filter(
    (s) => !schoolsInGroup?.some((sg) => sg.id === s.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Create a school group</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <Input
            placeholder="Group name (e.g. Beaconhouse Network)"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" disabled={createGroup.isPending}>
            {createGroup.isPending ? "Creating..." : "Create group"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Groups</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {groups?.length === 0 && (
          <EmptyState title="No school groups yet" description="Create your first group above." />
        )}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {groups?.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroupId(g.id)}
              className={`flex items-center justify-between py-3 text-left hover:text-brand-700 ${
                groupId === g.id ? "text-brand-700" : ""
              }`}
            >
              <span className="font-medium">{g.name}</span>
              <span className="text-sm text-slate-500">
                Created {new Date(g.createdAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {groupId && (
        <Card>
          <CardHeader>
            <CardTitle>Schools in this group</CardTitle>
          </CardHeader>
          <form onSubmit={handleAssign} className="mb-4 flex flex-wrap gap-3">
            <Select
              required
              value={assignSchoolId}
              onChange={(e) => setAssignSchoolId(e.target.value)}
              className="max-w-xs"
            >
              <option value="">Select school to add</option>
              {availableSchools?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Button type="submit" disabled={assignSchool.isPending}>
              {assignSchool.isPending ? "Adding..." : "Add to group"}
            </Button>
          </form>
          {schoolsInGroup?.length === 0 && <EmptyState title="No schools in this group yet" />}
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {schoolsInGroup?.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3">
                <span className="font-medium">{s.name}</span>
                <span className="text-sm text-slate-500">{s.subdomain}.skolara.app</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
