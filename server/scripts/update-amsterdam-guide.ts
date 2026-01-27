import { db } from "../db.js";
import { update9987Guides } from "@shared/schema.js";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function updateAmsterdamGuide() {
  const htmlPath = join(__dirname, "../data/amsterdam-guide-full-content.html");
  const htmlContent = readFileSync(htmlPath, "utf-8");

  const result = await db
    .update(update9987Guides)
    .set({
      rewrittenContent: htmlContent,
      metaTitle: "Amsterdam Travel Guide 2026: Costs, Canals, Museums | TRAVI",
      metaDescription:
        "Discover Amsterdam in 2026: honest costs from €80/day, canal walks, bike rentals, museum tips, brown cafes. Real traveler insights for your trip.",
      focusKeyword: "Amsterdam travel guide 2026",
      updatedAt: new Date(),
    } as any)
    .where(eq(update9987Guides.slug, "amsterdam-travel-guide"))
    .returning({ id: update9987Guides.id, slug: update9987Guides.slug });

  if (result.length > 0) {
  } else {
    const insertResult = await db
      .insert(update9987Guides)
      .values({
        slug: "amsterdam-travel-guide",
        destinationName: "Amsterdam",
        originalTitle: "Amsterdam Travel Guide 2026",
        rewrittenContent: htmlContent,
        metaTitle: "Amsterdam Travel Guide 2026: Costs, Canals, Museums | TRAVI",
        metaDescription:
          "Discover Amsterdam in 2026: honest costs from €80/day, canal walks, bike rentals, museum tips, brown cafes. Real traveler insights for your trip.",
        focusKeyword: "Amsterdam travel guide 2026",
        status: "published",
      } as any)
      .returning({ id: update9987Guides.id, slug: update9987Guides.slug });

    if (insertResult.length > 0) {
    }
  }

  process.exit(0);
}

updateAmsterdamGuide().catch(err => {
  process.exit(1);
});
