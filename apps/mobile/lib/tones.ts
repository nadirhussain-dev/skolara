import type { ComplaintStatus, LeaveStatus } from "@skolara/types";
import type { Tone } from "./ui";

export const CONCERN_TONE: Record<ComplaintStatus, Tone> = { OPEN: "warning", IN_PROGRESS: "brand", RESOLVED: "success" };
export const REQUEST_TONE: Record<LeaveStatus, Tone> = { PENDING: "warning", APPROVED: "success", REJECTED: "danger", CANCELLED: "neutral" };
