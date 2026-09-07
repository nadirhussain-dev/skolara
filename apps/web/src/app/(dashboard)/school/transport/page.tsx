"use client";

import {
  useApiClient,
  useAssignStudentToBus,
  useBuses,
  useBusLocation,
  useCreateBus,
  useStudentsByClass,
} from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
import { Button, Card, CardHeader, CardTitle, EmptyState, Input, PageHeader, Select } from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";

export default function TransportPage() {
  const api = useApiClient();
  const { t, locale } = useTranslation();
  const { data: buses, isLoading } = useBuses();
  const createBus = useCreateBus();
  const assignStudent = useAssignStudentToBus();

  const [plateNumber, setPlateNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [routeName, setRouteName] = useState("");

  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });
  const [classId, setClassId] = useState("");
  const { data: students } = useStudentsByClass(classId);

  const [assignBusId, setAssignBusId] = useState("");
  const [assignStudentId, setAssignStudentId] = useState("");
  const [assignedMessage, setAssignedMessage] = useState("");

  const [trackBusId, setTrackBusId] = useState("");
  const { data: location } = useBusLocation(trackBusId || undefined);

  async function handleCreateBus(e: React.FormEvent) {
    e.preventDefault();
    await createBus.mutateAsync({
      plateNumber,
      driverName,
      driverPhone: driverPhone || undefined,
      routeName,
    });
    setPlateNumber("");
    setDriverName("");
    setDriverPhone("");
    setRouteName("");
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignBusId || !assignStudentId) return;
    await assignStudent.mutateAsync({
      busId: assignBusId,
      input: { studentId: assignStudentId },
    });
    setAssignedMessage(t("transport.assigned"));
    setTimeout(() => setAssignedMessage(""), 3000);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("transport.title")} description={t("transport.description")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("transport.addBus")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreateBus} className="flex flex-wrap gap-3">
          <Input
            placeholder={t("transport.plateNumber")}
            required
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value)}
            className="max-w-[140px]"
          />
          <Input
            placeholder={t("transport.driverName")}
            required
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            placeholder={t("transport.driverPhoneOptional")}
            value={driverPhone}
            onChange={(e) => setDriverPhone(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            placeholder={t("transport.routeName")}
            required
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="max-w-[160px]"
          />
          <Button type="submit" disabled={createBus.isPending}>
            {createBus.isPending ? t("transport.adding") : t("transport.add")}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("transport.fleet")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {buses?.length === 0 && (
          <EmptyState title={t("transport.noBuses")} description={t("transport.noBusesBody")} />
        )}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {buses?.map((bus) => (
            <div key={bus.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">
                  {bus.plateNumber} — {bus.routeName}
                </p>
                <p className="text-sm text-slate-500">
                  {bus.driverName}
                  {bus.driverPhone ? ` · ${bus.driverPhone}` : ""}
                </p>
              </div>
              <Button variant="ghost" onClick={() => setTrackBusId(bus.id)}>
                {t("transport.track")}
              </Button>
            </div>
          ))}
        </div>

        {trackBusId && (
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-900">
            {location ? (
              <p>
                {t("transport.lastSeen", {
                  latitude: location.latitude.toFixed(5),
                  longitude: location.longitude.toFixed(5),
                  time: new Date(location.recordedAt).toLocaleTimeString(intlLocale(locale)),
                })}
              </p>
            ) : (
              <p className="text-slate-500">{t("transport.noLocation")}</p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("transport.assignStudent")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleAssign} className="flex flex-wrap items-center gap-3">
          <Select
            required
            value={assignBusId}
            onChange={(e) => setAssignBusId(e.target.value)}
            className="max-w-xs"
          >
            <option value="">{t("transport.selectBus")}</option>
            {buses?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.plateNumber} — {b.routeName}
              </option>
            ))}
          </Select>
          <Select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setAssignStudentId("");
            }}
            className="max-w-xs"
          >
            <option value="">{t("fields.selectClass")}</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.section}
              </option>
            ))}
          </Select>
          <Select
            required
            value={assignStudentId}
            onChange={(e) => setAssignStudentId(e.target.value)}
            className="max-w-xs"
            disabled={!classId}
          >
            <option value="">{t("fields.selectStudent")}</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user.firstName} {s.user.lastName} ({s.admissionNumber})
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={assignStudent.isPending}>
            {assignStudent.isPending ? t("transport.assigning") : t("transport.assign")}
          </Button>
        </form>
        {assignedMessage && <p className="mt-2 text-sm text-emerald-600">{assignedMessage}</p>}
      </Card>
    </div>
  );
}
