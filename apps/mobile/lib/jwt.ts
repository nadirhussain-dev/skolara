import type { RoleType } from "@skolara/types";

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64Decode(input: string): string {
  const clean = input.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const char of clean) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

export interface JwtClaims {
  sub: string;
  role: RoleType;
  schoolId: string | null;
}

/**
 * Reads the access token's claims. Purely for deciding what to render — the
 * API re-verifies the signature on every request, so a tampered token gets a
 * different UI and exactly the same permissions.
 */
export function decodeJwtClaims(token: string): JwtClaims | undefined {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(base64Decode(payload)) as JwtClaims;
  } catch {
    return undefined;
  }
}

export function decodeJwtSubject(token: string): string | undefined {
  return decodeJwtClaims(token)?.sub;
}
