import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import CursorDot from "@/components/CursorDot";
import BartenderWidget from "@/components/BartenderWidget";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const BASE_URL = "https://www.garnishbar.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Garnish | Private Bartender for Hire — Rehoboth Beach, DE",
    template: "%s | Garnish Private Bartender",
  },
  description:
    "Hire a private bartender for weddings, dinner parties, corporate events & more. Onur Kulualp brings 8 years of professional bar experience to Rehoboth Beach, DE, Philadelphia & DC.",
  keywords: [
    "private bartender",
    "rent a bartender near me",
    "bartender for hire",
    "private bartender Rehoboth Beach",
    "private bartender Delaware",
    "wedding bartender Delaware",
    "private event bartender",
    "mobile bartender",
    "bartender for private party",
    "cocktail bartender for hire",
    "bespoke bartending service",
    "bartender Philadelphia",
    "bartender DC",
    "private bartender near me",
  ],
  authors: [{ name: "Onur Kulualp" }],
  creator: "Onur Kulualp",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Garnish Private Bartender",
    title: "Garnish | Private Bartender for Hire — Rehoboth Beach, DE",
    description:
      "Hire a private bartender for your next event. Weddings, dinner parties, corporate events. Serving Rehoboth Beach, Philadelphia & DC.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Garnish — Private Bartender Service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Garnish | Private Bartender for Hire",
    description:
      "Bespoke bartending for private events. 8 years experience. Serving DE, Philadelphia & DC.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: BASE_URL,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LocalBusiness",
      "@id": `${BASE_URL}/#business`,
      name: "Garnish Private Bartender",
      url: BASE_URL,
      description:
        "Bespoke private bartending for weddings, dinner parties, corporate events, and more. Serving Rehoboth Beach DE, Philadelphia, and Washington DC.",
      founder: { "@type": "Person", name: "Onur Kulualp" },
      areaServed: [
        { "@type": "City", name: "Rehoboth Beach", containedIn: "Delaware" },
        { "@type": "City", name: "Philadelphia", containedIn: "Pennsylvania" },
        { "@type": "City", name: "Washington DC" },
        { "@type": "State", name: "Delaware" },
      ],
      serviceType: [
        "Private Bartender",
        "Wedding Bartender",
        "Corporate Event Bartender",
        "Dinner Party Bartender",
        "Mobile Bartending Service",
      ],
      telephone: process.env.NEXT_PUBLIC_PHONE_NUMBER,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Rehoboth Beach",
        addressRegion: "DE",
        addressCountry: "US",
      },
      priceRange: "$$",
      knowsAbout: [
        "Craft Cocktails",
        "Classic Bartending",
        "Seasonal Menus",
        "Private Event Service",
        "Wedding Bar Service",
      ],
    },
    {
      "@type": "Person",
      "@id": `${BASE_URL}/#person`,
      name: "Onur Kulualp",
      jobTitle: "Private Bartender",
      worksFor: { "@id": `${BASE_URL}/#business` },
      hasCredential: [
        "Bardea Food & Drink",
        "Stingray Sushi Bar & Asian Grill",
        "Bodhi Kitchen",
        "Drift Seafood & Raw Bar",
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-background text-foreground font-inter antialiased">
        <CursorDot />
        <Nav />
        {children}
        <BartenderWidget />
      </body>
    </html>
  );
}
