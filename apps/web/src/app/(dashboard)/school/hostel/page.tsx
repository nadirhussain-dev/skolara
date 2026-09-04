"use client";

import {
  useAllocateHostelBed,
  useApiClient,
  useCreateHostelRoom,
  useHostelRoom,
  useHostelRooms,
  useHostelSummary,
  useRemoveHostelRoom,
  useVacateHostelBed,
  type StudentWithUser,
} from "@skolara/api-client";
import { MAX_HOSTEL_ROOM_CAPACITY } from "@skolara/types";
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
  StatCard,
} from "@skolara/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

/** Beds as a row of pills — the fastest way to see what's free at a glance. */
function BedStrip({ capacity, freeBeds }: { capacity: number; freeBeds: number[] }) {
  const free = new Set(freeBeds);
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: capacity }, (_, index) => index + 1).map((bed) => (
        <span
          key={bed}
          title={free.has(bed) ? `Bed ${bed} — free` : `Bed ${bed} — occupied`}
          className={
            free.has(bed)
              ? "inline-flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs tabular-nums text-slate-400 dark:border-slate-700 dark:text-slate-500"
              : "inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-700 text-xs font-semibold tabular-nums text-white"
          }
        >
          {bed}
        </span>
      ))}
    </div>
  );
}

export default function HostelPage() {
  const api = useApiClient();
  const { data: summary } = useHostelSummary();
  const [onlyFree, setOnlyFree] = useState(false);
  const { data: rooms, isLoading } = useHostelRooms({ onlyWithFreeBeds: onlyFree });

  const [openRoomId, setOpenRoomId] = useState<string>();
  const { data: room } = useHostelRoom(openRoomId);

  const createRoom = useCreateHostelRoom();
  const removeRoom = useRemoveHostelRoom();
  const allocate = useAllocateHostelBed();
  const vacate = useVacateHostelBed();

  const [blockName, setBlockName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [roomError, setRoomError] = useState("");

  const [studentId, setStudentId] = useState("");
  const [bedNumber, setBedNumber] = useState("");
  const [allocateError, setAllocateError] = useState("");

  // Every student in the school — hostel residents aren't scoped to one class.
  const { data: students } = useQuery<StudentWithUser[]>({
    queryKey: ["students", "all"],
    queryFn: () => api.students.all(),
    enabled: Boolean(openRoomId),
  });

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    setRoomError("");
    try {
      await createRoom.mutateAsync({
        blockName,
        roomNumber,
        floor: floor === "" ? null : Number(floor),
        capacity,
      });
      setRoomNumber("");
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : "Couldn't add that room");
    }
  }

  async function handleAllocate(e: React.FormEvent) {
    e.preventDefault();
    setAllocateError("");
    if (!openRoomId) return;
    try {
      await allocate.mutateAsync({
        roomId: openRoomId,
        input: {
          studentId,
          // Blank means "any free bed" — the server picks the lowest, which is
          // also what stops two wardens racing for the same number.
          bedNumber: bedNumber === "" ? undefined : Number(bedNumber),
        },
      });
      setStudentId("");
      setBedNumber("");
    } catch (err) {
      setAllocateError(err instanceof Error ? err.message : "Couldn't allocate that bed");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hostel"
        description="Rooms, beds and who is in them. Occupancy follows from the allocations."
      />

      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Rooms" value={summary.rooms} icon="🚪" />
          <StatCard label="Beds" value={summary.capacity} icon="🛏️" />
          <StatCard label="Occupied" value={summary.occupied} icon="🧑‍🎓" />
          <StatCard label="Occupancy" value={`${summary.occupancyRate}%`} icon="📊" />
        </div>
      )}

      {(summary?.byBlock.length ?? 0) > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>By block</CardTitle>
          </CardHeader>
          <ul className="flex flex-col gap-2">
            {summary?.byBlock.map((block) => (
              <li key={block.blockName} className="flex items-center justify-between gap-3">
                <span className="font-medium">{block.blockName}</span>
                <span className="text-sm tabular-nums text-slate-500">
                  {block.occupied}/{block.capacity} beds · {block.rooms} room
                  {block.rooms === 1 ? "" : "s"} · {block.occupancyRate}%
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add a room</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreateRoom} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Block
            <Input
              required
              value={blockName}
              onChange={(e) => setBlockName(e.target.value)}
              className="max-w-[160px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Room
            <Input
              required
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="max-w-[120px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Floor
            <Input
              type="number"
              placeholder="—"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="max-w-[100px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Beds
            <Input
              type="number"
              min={1}
              max={MAX_HOSTEL_ROOM_CAPACITY}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="max-w-[100px]"
            />
          </label>
          <Button type="submit" disabled={createRoom.isPending}>
            {createRoom.isPending ? "Adding…" : "Add room"}
          </Button>
          {roomError && <p className="text-sm text-rose-600">{roomError}</p>}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rooms</CardTitle>
        </CardHeader>
        <div className="mb-3">
          <Button variant="ghost" onClick={() => setOnlyFree((current) => !current)}>
            {onlyFree ? "Show all rooms" : "Only rooms with free beds"}
          </Button>
        </div>
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {!isLoading && rooms?.length === 0 && (
          <EmptyState
            icon="🏨"
            title={onlyFree ? "Every room is full." : "No rooms yet."}
            description={onlyFree ? undefined : "Add a block and room number above."}
          />
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {rooms?.map((entry) => (
            <li key={entry.roomId} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {entry.blockName} {entry.roomNumber}
                  </p>
                  {entry.floor !== null && (
                    <Badge tone="neutral">Floor {entry.floor}</Badge>
                  )}
                  {entry.freeBeds.length === 0 ? (
                    <Badge tone="warning">Full</Badge>
                  ) : (
                    <Badge tone="success">
                      {entry.freeBeds.length} free
                    </Badge>
                  )}
                </div>
                <div className="mt-2">
                  <BedStrip capacity={entry.capacity} freeBeds={entry.freeBeds} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setOpenRoomId((current) => (current === entry.roomId ? undefined : entry.roomId))
                  }
                >
                  {openRoomId === entry.roomId ? "Close" : "Manage"}
                </Button>
                {entry.occupied === 0 && (
                  <Button variant="ghost" onClick={() => removeRoom.mutate(entry.roomId)}>
                    Delete
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {openRoomId && room && (
        <Card>
          <CardHeader>
            <CardTitle>
              {room.blockName} {room.roomNumber} — {room.residents.length}/{room.capacity} beds
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleAllocate} className="mb-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Student
              <Select
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="max-w-xs"
              >
                <option value="">Select student</option>
                {students?.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.user.firstName} {student.user.lastName} · {student.admissionNumber}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Bed
              <Select
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value)}
                className="max-w-[140px]"
              >
                <option value="">Any free bed</option>
                {room.freeBeds.map((bed) => (
                  <option key={bed} value={bed}>
                    Bed {bed}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" disabled={allocate.isPending || room.freeBeds.length === 0}>
              {allocate.isPending ? "Allocating…" : "Allocate"}
            </Button>
            {room.freeBeds.length === 0 && (
              <p className="text-sm text-slate-500">This room is full.</p>
            )}
            {allocateError && <p className="text-sm text-rose-600">{allocateError}</p>}
          </form>

          {room.residents.length === 0 && <EmptyState title="Nobody in this room yet." />}
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {room.residents.map((resident) => (
              <li key={resident.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium">
                    <span className="mr-2 text-sm tabular-nums text-slate-400">
                      Bed {resident.bedNumber}
                    </span>
                    {resident.student.user.firstName} {resident.student.user.lastName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {resident.student.admissionNumber}
                    {resident.student.class
                      ? ` · ${resident.student.class.name} ${resident.student.class.section}`
                      : ""}
                    {" · in since "}
                    {new Date(resident.allocatedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => vacate.mutate(resident.id)}>
                  Move out
                </Button>
              </li>
            ))}
          </ul>

          {room.past.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-slate-500">
                Past residents ({room.past.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-500">
                {room.past.map((resident) => (
                  <li key={resident.id}>
                    Bed {resident.bedNumber} · {resident.student.user.firstName}{" "}
                    {resident.student.user.lastName} · until{" "}
                    {resident.vacatedAt &&
                      new Date(resident.vacatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      )}
    </div>
  );
}
