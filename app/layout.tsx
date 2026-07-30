import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { getResolvedSiteSettings } from "@/app/lib/site-settings-service";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getResolvedSiteSettings();

  return {
    metadataBase: new URL(site.url),
    title: {
      default: site.siteName,
      template: `%s | ${site.siteName}`,
    },
    description: site.description,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
