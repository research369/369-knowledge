import { Router } from "express";
import { db } from "../db/index.js";
import { entities } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const sitemapRouter = Router();

sitemapRouter.get("/sitemap.xml", async (_req, res) => {
  try {
    const published = await db
      .select({
        id: entities.id,
        canonicalName: entities.canonicalName,
        updatedAt: entities.updatedAt,
      })
      .from(entities)
      .where(eq(entities.status, "published"));

    const baseUrl = "https://portal.369research.eu";

    const urls = [
      // Hub-Seite
      `  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`,
      // Alle Entitäten
      ...published.map((e) => {
        const slug = e.canonicalName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const lastmod = new Date(e.updatedAt).toISOString().split("T")[0];
        return `  <url>
    <loc>${baseUrl}/wissen/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600"); // 1 hour cache
    res.send(xml);
  } catch (err) {
    console.error("Sitemap error:", err);
    res.status(500).send("Error generating sitemap");
  }
});
