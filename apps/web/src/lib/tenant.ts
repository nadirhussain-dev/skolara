import { headers } from "next/headers";
import { TENANT_HEADER } from "@/middleware";

/**
 * The school subdomain this request arrived on, or null on the platform host.
 * Server-only — the header is set by middleware and isn't visible to the
 * browser bundle.
 */
export async function currentSubdomain(): Promise<string | null> {
  const headerList = await headers();
  return headerList.get(TENANT_HEADER);
}
