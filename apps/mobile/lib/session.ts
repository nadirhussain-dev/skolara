import { useEffect, useState } from "react";
import type { RoleType } from "@skolara/types";
import { getStoredAccessToken } from "./api-client";
import { decodeJwtClaims } from "./jwt";

export interface Session {
  userId?: string;
  role?: RoleType;
  /** False until the stored token has been read — screens shouldn't decide what to render before then. */
  isLoaded: boolean;
}

/**
 * The signed-in user's identity, read from the stored access token.
 *
 * Used only to choose what to show. Every authorisation decision is made by
 * the API against the token's signature, so this can be wrong without being
 * dangerous.
 */
export function useSession(): Session {
  const [session, setSession] = useState<Session>({ isLoaded: false });

  useEffect(() => {
    let active = true;
    getStoredAccessToken().then((token) => {
      if (!active) return;
      const claims = token ? decodeJwtClaims(token) : undefined;
      setSession({ userId: claims?.sub, role: claims?.role, isLoaded: true });
    });
    return () => {
      active = false;
    };
  }, []);

  return session;
}
