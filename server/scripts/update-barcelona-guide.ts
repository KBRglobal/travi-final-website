import { db } from "../db.js";
import { update9987Guides } from "@shared/schema.js";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function updateBarcelonaGuide() {
  const htmlPath = join(__dirname, "../data/barcelona-guide-full-content.html");
  const htmlContent = readFileSync(htmlPath, "utf-8");

  const result = await db
    .update(update9987Guides)
    .set({
      rewrittenContent: htmlContent,
      metaTitle: "Barcelona Travel Guide 2026: Costs, Gaudí, Best Time | TRAVI",
      metaDescription:
        "Discover Barcelona in 2026: honest costs from €80/day, Sagrada Familia tips, Gothic Quarter walks, tapas trails. Real traveler insights.",
      focusKeyword: "Barcelona travel guide 2026",
      updatedAt: new Date(),
    } as any)
    .where(eq(update9987Guides.slug, "barcelona-travel-guide"))
    .returning({ id: update9987Guides.id, slug: update9987Guides.slug });

  if (result.length > 0) {
  } else {
  }

  process.exit(0);
}

updateBarcelonaGuide().catch(err => {
  process.exit(1);
});
