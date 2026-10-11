/**
 * Sent with every response from the web app.
 *
 * The session token lives in localStorage, so anything that lets a foreign
 * page drive or frame this one matters more than usual. These headers stop
 * the dashboard being embedded in another site (clickjacking), stop forms
 * and <base> being pointed elsewhere, and keep the browser from guessing
 * content types.
 *
 * A script-src policy is deliberately not set here: Next.js needs per-request
 * nonces for its inline scripts, which is a change to middleware rather than
 * a static header. Tracked as a follow-up in docs/SECURITY.md.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Ignored by browsers over plain http, so local development is unaffected.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@skolara/ui",
    "@skolara/api-client",
    "@skolara/types",
    "@skolara/i18n",
    "@skolara/utils",
  ],
  // Don't advertise the framework and version to anyone probing for exploits.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
