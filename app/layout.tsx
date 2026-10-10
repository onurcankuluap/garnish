import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import CursorDot from "@/components/CursorDot";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const BASE_URL = "https://www.garnish.info";

// Copy here repeats only what the site already publishes. Unverified
// claims (service in Philadelphia/DC, "8 years", former venues as
// credentials, a price range) were removed pending owner confirmation.
const DESCRIPTION =
  "Private bartender for weddings, dinner parties, corporate events and more, based in Rehoboth Beach, Delaware. Send an inquiry and get a personal call back.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Garnish | Private Bartender for Hire — Rehoboth Beach, DE",
    template: "%s | Garnish Private Bartender",
  },
  description: DESCRIPTION,
  authors: [{ name: "Onur Kulualp" }],
  creator: "Onur Kulualp",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Garnish Private Bartender",
    title: "Garnish | Private Bartender for Hire — Rehoboth Beach, DE",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Garnish | Private Bartender for Hire",
    description: DESCRIPTION,
  },
};

// Structured data: only facts the site publishes. No areaServed beyond the
// published base town, no experience years, no former-venue "credentials",
// no priceRange (owner to confirm before any of these return).
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LocalBusiness",
      "@id": `${BASE_URL}/#business`,
      name: "Garnish Private Bartender",
      url: BASE_URL,
      image: `${BASE_URL}/opengraph-image`,
      description: DESCRIPTION,
      founder: { "@id": `${BASE_URL}/#person` },
      serviceType: [
        "Private Bartender",
        "Wedding Bartender",
        "Corporate Event Bartender",
        "Dinner Party Bartender",
      ],
      ...(process.env.NEXT_PUBLIC_PHONE_NUMBER ? { telephone: process.env.NEXT_PUBLIC_PHONE_NUMBER } : {}),
      address: {
        "@type": "PostalAddress",
        addressLocality: "Rehoboth Beach",
        addressRegion: "DE",
        addressCountry: "US",
      },
    },
    {
      "@type": "Person",
      "@id": `${BASE_URL}/#person`,
      name: "Onur Kulualp",
      jobTitle: "Private Bartender",
      worksFor: { "@id": `${BASE_URL}/#business` },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${cormorant.variable} ${inter.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-background text-foreground font-inter antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <CursorDot />
        <Nav />
        {children}
      </body>
    </html>
  );
}
