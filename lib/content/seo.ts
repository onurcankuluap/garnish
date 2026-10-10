import { business, eventTypes, verifiedValue } from "./facts";

export const BASE_URL = "https://www.garnish.info";

const town = verifiedValue(business.baseTown);
const name = verifiedValue(business.name);

/**
 * Meta copy and structured data are built from verified facts only. Anything
 * the owner has not confirmed (service area, experience, venues, prices, the
 * callback promise) never appears here, whatever the page shows.
 */
export const DESCRIPTION = `Private bartender for weddings, dinner parties, corporate events and more${
  town ? `, based in ${town.locality}, ${town.region === "DE" ? "Delaware" : town.region}` : ""
}. Compose your bar and check your date.`;

export const SITE_TITLE = `${name ?? "Garnish"} | Private Bartender for Hire${town ? ` — ${town.label}` : ""}`;

export function jsonLd() {
  const owner = verifiedValue(business.owner);
  const tel = verifiedValue(business.phone);
  const types = verifiedValue(eventTypes);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": `${BASE_URL}/#business`,
        name: `${name ?? "Garnish"} Private Bartender`,
        url: BASE_URL,
        image: `${BASE_URL}/opengraph-image`,
        description: DESCRIPTION,
        ...(owner ? { founder: { "@id": `${BASE_URL}/#person` } } : {}),
        ...(types
          ? {
              serviceType: [
                "Private Bartender",
                ...types.filter((t) => t.key !== "other").map((t) => `${t.formValue} Bartender`),
              ],
            }
          : {}),
        ...(tel ? { telephone: tel.tel } : {}),
        ...(town
          ? { address: { "@type": "PostalAddress", addressLocality: town.locality, addressRegion: town.region, addressCountry: town.country } }
          : {}),
      },
      ...(owner
        ? [{ "@type": "Person", "@id": `${BASE_URL}/#person`, name: owner, jobTitle: "Private Bartender", worksFor: { "@id": `${BASE_URL}/#business` } }]
        : []),
    ],
  };
}
