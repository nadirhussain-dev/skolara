import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MarkAttendanceInput } from "@skolara/types";
import { ApiError } from "@skolara/api-client";
import { apiClient } from "./api-client";

const QUEUE_KEY = "skolara_offline_attendance";

export interface QueuedAttendance {
  /** Local id, so a flush can remove exactly the entries it drained. */
  id: string;
  queuedAt: string;
  classId: string;
  /** ISO string — `Date` doesn't survive the JSON round-trip through storage. */
  date: string;
  entries: { studentId: string; status: MarkAttendanceInput["entries"][number]["status"] }[];
}

export interface FlushResult {
  synced: number;
  /** Entries that couldn't be sent yet and are still waiting in the queue. */
  remaining: number;
  /** Entries the server permanently rejected — dropped rather than retried forever. */
  discarded: number;
}

async function readQueue(): Promise<QueuedAttendance[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedAttendance[]) : [];
  } catch {
    // A corrupt queue shouldn't brick attendance marking — start clean.
    return [];
  }
}

async function writeQueue(queue: QueuedAttendance[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function queuedCount(): Promise<number> {
  return (await readQueue()).length;
}

/**
 * Parks a register that couldn't be sent. Re-marking the same class on the
 * same day replaces the earlier queued entry rather than stacking a second
 * one — the API upserts per (class, student, date), so only the latest
 * version of the register matters.
 */
export async function enqueueAttendance(
  input: Omit<QueuedAttendance, "id" | "queuedAt">,
): Promise<void> {
  const queue = await readQueue();
  const withoutSameRegister = queue.filter(
    (item) => !(item.classId === input.classId && item.date === input.date),
  );
  withoutSameRegister.push({
    ...input,
    id: `${input.classId}:${input.date}:${Date.now()}`,
    queuedAt: new Date().toISOString(),
  });
  await writeQueue(withoutSameRegister);
}

/**
 * Drains whatever is queued. Anything the server rejects with a 4xx is
 * discarded — a malformed or no-longer-valid register will never succeed, and
 * retrying it forever would block everything queued behind it.
 */
export async function flushAttendanceQueue(): Promise<FlushResult> {
  const queue = await readQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0, discarded: 0 };

  const stillQueued: QueuedAttendance[] = [];
  let synced = 0;
  let discarded = 0;

  for (const item of queue) {
    try {
      await apiClient.attendance.mark({
        classId: item.classId,
        date: new Date(item.date),
        markedOffline: true,
        entries: item.entries,
      });
      synced += 1;
    } catch (error) {
      const isPermanent =
        error instanceof ApiError && error.status >= 400 && error.status < 500;
      if (isPermanent) {
        discarded += 1;
      } else {
        stillQueued.push(item);
      }
    }
  }

  await writeQueue(stillQueued);
  return { synced, remaining: stillQueued.length, discarded };
}
