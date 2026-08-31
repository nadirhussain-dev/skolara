import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Opts a single route out of the controller's JWT guard. Used for the handful
 * of genuinely unauthenticated endpoints — self-serve signup, subdomain
 * availability, health checks — so those controllers don't have to drop their
 * class-level guard and re-add it per method.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
