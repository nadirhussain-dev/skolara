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
  themeColor: "#6D28D9",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await currentLocale();

  return (
    <html lang={locale} dir={LOCALE_META[locale].dir}>
      <body className="font-sans">
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
