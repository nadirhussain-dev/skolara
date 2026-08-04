import type { RoleType } from "@skolara/types";

export interface JwtPayload {
  sub: string;
  role: RoleType;
  schoolId: string | null;
}

export interface AuthenticatedUser {
  id: string;
  role: RoleType;
  schoolId: string | null;
}
