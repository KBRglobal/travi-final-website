import { db } from "../db.js";
import { update9987Guides } from "@shared/schema.js";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function updateTokyoGuide() {
  const htmlPath = join(__dirname, "../data/tokyo-guide-full-content.html");
  const htmlContent = readFileSync(htmlPath, "utf-8");

  const result = await db
    .update(update9987Guides)
    .set({
      rewrittenContent: htmlContent,
      metaTitle: "Tokyo Travel Guide 2026: Costs, Hotels, Best Time | TRAVI",
      metaDescription:
        "Discover Tokyo in 2026: honest costs from $100/day, best hotels from $60, top attractions, insider tips. Realistic guide for first-time visitors.",
      focusKeyword: "Tokyo travel guide 2026",
      updatedAt: new Date(),
    } as any)
    .where(eq(update9987Guides.slug, "tokyo-travel-guide"))
    .returning({ id: update9987Guides.id, slug: update9987Guides.slug });

  if (result.length > 0) {
  } else {
  }

  process.exit(0);
}

updateTokyoGuide().catch(err => {
  process.exit(1);
});
