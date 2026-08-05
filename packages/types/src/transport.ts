import { z } from "zod";

export const busSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  plateNumber: z.string().min(1),
  driverName: z.string().min(1),
  driverPhone: z.string().nullable(),
  routeName: z.string().min(1),
});
export type Bus = z.infer<typeof busSchema>;

export const createBusSchema = busSchema
  .omit({ id: true, schoolId: true, driverPhone: true })
  .extend({ driverPhone: z.string().optional() });
export type CreateBusInput = z.infer<typeof createBusSchema>;

export const busLocationPingSchema = z.object({
  id: z.string().uuid(),
  busId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  recordedAt: z.coerce.date(),
});
export type BusLocationPing = z.infer<typeof busLocationPingSchema>;

export const reportBusLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});
export type ReportBusLocationInput = z.infer<typeof reportBusLocationSchema>;

export const assignStudentToBusSchema = z.object({
  studentId: z.string().uuid(),
});
export type AssignStudentToBusInput = z.infer<typeof assignStudentToBusSchema>;
