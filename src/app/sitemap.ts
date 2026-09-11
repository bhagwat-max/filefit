import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://filefit-mu.vercel.app", lastModified: new Date(), changeFrequency: "weekly", priority: 1 }];
}
