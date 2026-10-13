import { LOCALE_META } from "@skolara/i18n";
import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { currentLocale } from "@/lib/locale";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Skolara",
    template: "%s · Skolara",
  },
  description: "Modern, AI-assisted school management SaaS",
};

export const viewport: Viewport = {
  themeColor: "#3730A3",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await currentLocale();

  return (
    <html lang={locale} dir={LOCALE_META[locale].dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* The root layout wraps every route, so the pages-router warning
            about per-page fonts doesn't apply here. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body className="font-sans">
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
