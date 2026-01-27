import { db } from "../db.js";
import { update9987Guides } from "@shared/schema.js";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function updateDubaiGuide() {
  const htmlPath = join(__dirname, "../data/dubai-guide-full-content.html");
  const htmlContent = readFileSync(htmlPath, "utf-8");

  const result = await db
    .update(update9987Guides)
    .set({
      rewrittenContent: htmlContent,
      metaTitle: "Dubai Travel Guide 2026: Costs, Hotels, Best Time | TRAVI",
      metaDescription:
        "Discover Dubai in 2026: honest costs from $100/day, Burj Khalifa tips, desert safaris, Old Dubai souks, best beaches. Real traveler insights.",
      focusKeyword: "Dubai travel guide 2026",
      updatedAt: new Date(),
    } as any)
    .where(eq(update9987Guides.slug, "dubai-travel-guide"))
    .returning({ id: update9987Guides.id, slug: update9987Guides.slug });

  if (result.length > 0) {
  } else {
    const insertResult = await db
      .insert(update9987Guides)
      .values({
        slug: "dubai-travel-guide",
        destination: "Dubai",
        originalContent: "",
        rewrittenContent: htmlContent,
        metaTitle: "Dubai Travel Guide 2026: Costs, Hotels, Best Time | TRAVI",
        metaDescription:
          "Discover Dubai in 2026: honest costs from $100/day, Burj Khalifa tips, desert safaris, Old Dubai souks, best beaches. Real traveler insights.",
        focusKeyword: "Dubai travel guide 2026",
        status: "published",
      } as any)
      .returning({ id: update9987Guides.id, slug: update9987Guides.slug });

    if (insertResult.length > 0) {
    }
  }

  process.exit(0);
}

updateDubaiGuide().catch(err => {
  process.exit(1);
});
