"use client";

import {
  useAssignSchoolToGroup,
  useCreateSchoolGroup,
  useSchoolGroups,
  useSchools,
  useSchoolsInGroup,
} from "@skolara/api-client";
import { Button, Card, CardHeader, CardTitle, EmptyState, Input, PageHeader, Select } from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";

export default function SchoolGroupsPage() {
  const { t, locale } = useTranslation();
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
      <PageHeader
        title={t("schoolGroups.title")}
        description={t("schoolGroups.description")}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("schoolGroups.createGroup")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <Input
            placeholder={t("schoolGroups.nameHint")}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" disabled={createGroup.isPending}>
            {createGroup.isPending ? t("schoolGroups.creating") : t("schoolGroups.create")}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("schoolGroups.groups")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {groups?.length === 0 && (
          <EmptyState title={t("schoolGroups.noGroups")} description={t("schoolGroups.noGroupsBody")} />
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
                {t("schoolGroups.createdOn", {
                  date: new Date(g.createdAt).toLocaleDateString(intlLocale(locale)),
                })}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {groupId && (
        <Card>
          <CardHeader>
            <CardTitle>{t("schoolGroups.schoolsInGroup")}</CardTitle>
          </CardHeader>
          <form onSubmit={handleAssign} className="mb-4 flex flex-wrap gap-3">
            <Select
              required
              value={assignSchoolId}
              onChange={(e) => setAssignSchoolId(e.target.value)}
              className="max-w-xs"
            >
              <option value="">{t("schoolGroups.selectSchool")}</option>
              {availableSchools?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Button type="submit" disabled={assignSchool.isPending}>
              {assignSchool.isPending ? t("schoolGroups.adding") : t("schoolGroups.addToGroup")}
            </Button>
          </form>
          {schoolsInGroup?.length === 0 && <EmptyState title={t("schoolGroups.noSchoolsInGroup")} />}
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
