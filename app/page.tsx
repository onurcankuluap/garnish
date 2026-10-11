import type { Metadata } from "next";
import Stage from "@/components/home/Stage";
import Compose from "@/components/home/Compose";
import { About, BookBand, Evenings, Faq } from "@/components/home/Sections";
import { BASE_URL } from "@/lib/content/seo";

export const metadata: Metadata = {
  alternates: { canonical: BASE_URL },
};

/**
 * The home page, one storyboard:
 * 01 arrival → 02 Plate I: the bar (with 03, the occasions) → 04 Compose your
 * bar → 05 Evenings → 06 About → 07 FAQ → 08 Book.
 */
export default function Home() {
  return (
    <main id="main" tabIndex={-1}>
      <Stage />
      <Compose />
      <Evenings />
      <About />
      <Faq />
      <BookBand />
    </main>
  );
}
