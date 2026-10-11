import { MetadataRoute } from "next";
import { privacyNotice } from "@/lib/content/facts";

const BASE_URL = "https://www.garnish.info";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/book`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    // the privacy notice is listed once the owner approves it (until then it is noindex)
    ...(privacyNotice.approved
      ? [{ url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 }]
      : []),
  ];
}
