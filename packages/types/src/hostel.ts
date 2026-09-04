import { z } from "zod";

/** A room bigger than this is a dormitory nobody addresses by bed number. */
export const MAX_HOSTEL_ROOM_CAPACITY = 20;

export const hostelRoomSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  blockName: z.string(),
  roomNumber: z.string(),
  floor: z.number().int().nullable(),
  capacity: z.number().int(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type HostelRoom = z.infer<typeof hostelRoomSchema>;

export const hostelAllocationSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  roomId: z.string().uuid(),
  studentId: z.string().uuid(),
  bedNumber: z.number().int(),
  allocatedAt: z.coerce.date(),
  vacatedAt: z.coerce.date().nullable(),
  notes: z.string().nullable(),
});
export type HostelAllocation = z.infer<typeof hostelAllocationSchema>;

export const upsertHostelRoomSchema = z.object({
  blockName: z.string().min(1).max(60),
  roomNumber: z.string().min(1).max(20),
  floor: z.number().int().min(-2).max(50).nullable().optional(),
  capacity: z.number().int().min(1).max(MAX_HOSTEL_ROOM_CAPACITY),
  notes: z.string().max(500).nullable().optional(),
});
export type UpsertHostelRoomInput = z.infer<typeof upsertHostelRoomSchema>;

/**
 * `bedNumber` is optional: a warden allocating a student usually wants "any
 * free bed in room 12", not a specific one. Omitting it lets the server pick
 * the lowest free bed, which is also the only way to do it without the client
 * racing another warden for the same number.
 */
export const allocateHostelBedSchema = z.object({
  studentId: z.string().uuid(),
  bedNumber: z.number().int().min(1).max(MAX_HOSTEL_ROOM_CAPACITY).optional(),
  notes: z.string().max(500).optional(),
});
export type AllocateHostelBedInput = z.infer<typeof allocateHostelBedSchema>;

/** Derived from current allocations, never stored on the room. */
export interface HostelOccupancy {
  roomId: string;
  blockName: string;
  roomNumber: string;
  floor: number | null;
  capacity: number;
  occupied: number;
  freeBeds: number[];
}

export interface HostelSummary {
  rooms: number;
  capacity: number;
  occupied: number;
  /** Whole percent of beds in use, across every block. */
  occupancyRate: number;
  byBlock: {
    blockName: string;
    rooms: number;
    capacity: number;
    occupied: number;
    occupancyRate: number;
  }[];
}
