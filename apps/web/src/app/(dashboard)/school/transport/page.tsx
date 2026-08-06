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
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function TransportPage() {
  const api = useApiClient();
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
    setAssignedMessage("Student assigned to bus.");
    setTimeout(() => setAssignedMessage(""), 3000);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Transport" description="Manage the bus fleet and student assignments." />
      <Card>
        <CardHeader>
          <CardTitle>Add a bus</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreateBus} className="flex flex-wrap gap-3">
          <Input
            placeholder="Plate number"
            required
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value)}
            className="max-w-[140px]"
          />
          <Input
            placeholder="Driver name"
            required
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            placeholder="Driver phone (optional)"
            value={driverPhone}
            onChange={(e) => setDriverPhone(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            placeholder="Route name"
            required
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="max-w-[160px]"
          />
          <Button type="submit" disabled={createBus.isPending}>
            {createBus.isPending ? "Adding..." : "Add bus"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fleet</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {buses?.length === 0 && (
          <EmptyState title="No buses yet" description="Add your first bus above." />
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
                Track
              </Button>
            </div>
          ))}
        </div>

        {trackBusId && (
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-900">
            {location ? (
              <p>
                Last seen at {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} ·{" "}
                {new Date(location.recordedAt).toLocaleTimeString()}
              </p>
            ) : (
              <p className="text-slate-500">No location reported yet.</p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign a student to a bus</CardTitle>
        </CardHeader>
        <form onSubmit={handleAssign} className="flex flex-wrap items-center gap-3">
          <Select
            required
            value={assignBusId}
            onChange={(e) => setAssignBusId(e.target.value)}
            className="max-w-xs"
          >
            <option value="">Select bus</option>
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
            <option value="">Select class</option>
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
            <option value="">Select student</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user.firstName} {s.user.lastName} ({s.admissionNumber})
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={assignStudent.isPending}>
            {assignStudent.isPending ? "Assigning..." : "Assign"}
          </Button>
        </form>
        {assignedMessage && <p className="mt-2 text-sm text-emerald-600">{assignedMessage}</p>}
      </Card>
    </div>
  );
}
