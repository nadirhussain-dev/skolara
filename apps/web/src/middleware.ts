import { NextResponse, type NextRequest } from "next/server";

/**
 * Header the app reads to know which school's subdomain the request arrived
 * on. Set here rather than parsed in the page so there is exactly one place
 * that decides what counts as a tenant host.
 */
export const TENANT_HEADER = "x-skolara-subdomain";

/**
 * Hosts that are the platform itself, not a school. Anything else with a
 * subdomain under the app domain is treated as a tenant.
 */
const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin", "staging", "preview"]);

/**
 * Pulls the school subdomain out of the Host header.
 *
 * Returns null for apex domains, reserved hosts, localhost, and raw IPs —
 * `localhost:3000` and `skolara.app` are both the platform, not a school.
 * Local development can still exercise this via `acme.localhost:3000`.
 */
export function subdomainFromHost(host: string | null): string | null {
  if (!host) return null;

  const hostname = (host.split(":")[0] ?? "").toLowerCase();
  if (!hostname || hostname === "localhost" || /^\d+(\.\d+){3}$/.test(hostname)) {
    return null;
  }

  const labels = hostname.split(".");
  const isLocalhostSubdomain = labels.length === 2 && labels[1] === "localhost";
  // Needs at least sub.domain.tld to have a subdomain at all.
  if (labels.length < 3 && !isLocalhostSubdomain) return null;

  const candidate = labels[0];
  if (!candidate || RESERVED_SUBDOMAINS.has(candidate)) return null;
  return candidate;
}

export function middleware(request: NextRequest) {
  const subdomain = subdomainFromHost(request.headers.get("host"));

  const headers = new Headers(request.headers);
  if (subdomain) headers.set(TENANT_HEADER, subdomain);
  else headers.delete(TENANT_HEADER);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Static assets don't need tenant resolution.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
