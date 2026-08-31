/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@skolara/ui",
    "@skolara/api-client",
    "@skolara/types",
    "@skolara/i18n",
    "@skolara/utils",
  ],
};

export default nextConfig;
