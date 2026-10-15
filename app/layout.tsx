import type { Metadata } from "next";
import "./globals.css";
import {siteUrl,siteTitle,siteDescription} from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL('https://signal-audit-lab.shabeehshah42.chatgpt.site'),
  title: siteTitle,
  description: siteDescription,
  openGraph: {type:'website',siteName:'Signal',title:siteTitle,description:siteDescription,url:siteUrl,images:[{url:'/og',width:1200,height:630,alt:'Signal — SEO and AI search readiness with evidence and practical fixes'}]},
  twitter: {card:'summary_large_image',title:siteTitle,description:siteDescription,images:['/og']},
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
