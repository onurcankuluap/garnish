import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import "./styles/lit.css";
import Header from "@/components/site/Header";
import MobileBar from "@/components/site/MobileBar";
import Footer from "@/components/site/Footer";
import GarnishChat from "@/components/GarnishChat";
import { BASE_URL, DESCRIPTION, SITE_TITLE, jsonLd } from "@/lib/content/seo";
import { business } from "@/lib/content/facts";

// Self-hosted at build time by next/font (no request to Google at runtime),
// with metric-adjusted fallbacks so the swap does not shift the layout.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Garnish Private Bartender",
  },
  description: DESCRIPTION,
  authors: business.owner.verified ? [{ name: business.owner.value }] : undefined,
  creator: business.owner.verified ? business.owner.value : undefined,
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Garnish Private Bartender",
    title: SITE_TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Garnish | Private Bartender for Hire",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0B0B0A",
};

// Before first paint: choose the motion mode, so the static composition never
// shifts when JavaScript arrives. "intro" (the CSS light-up) plays on the
// first home-page view of a session.
const PREPAINT = `(function(){var d=document.documentElement,rm=matchMedia("(prefers-reduced-motion: reduce)").matches;d.classList.add(rm?"rm":"js-motion");if(rm||location.pathname!=="/")return;try{if(sessionStorage.getItem("g:intro"))return;sessionStorage.setItem("g:intro","1")}catch(e){}d.classList.add("intro")})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        {children}
        <Footer />
        <MobileBar />
        <GarnishChat />
      </body>
    </html>
  );
}
