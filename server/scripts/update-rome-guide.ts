import { db } from "../db.js";
import { update9987Guides } from "@shared/schema.js";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function updateRomeGuide() {
  const htmlPath = join(__dirname, "../data/rome-guide-full-content.html");
  const htmlContent = readFileSync(htmlPath, "utf-8");

  const result = await db
    .update(update9987Guides)
    .set({
      rewrittenContent: htmlContent,
      metaTitle: "Rome Travel Guide 2026: Colosseum, Vatican, Costs | TRAVI",
      metaDescription:
        "Plan your Rome trip: honest costs from €80/day, skip-the-line Vatican tips, authentic trattorias, best neighborhoods. Real traveler insights for 2026 visits.",
      focusKeyword: "Rome travel guide 2026",
      updatedAt: new Date(),
    } as any)
    .where(eq(update9987Guides.slug, "rome-travel-guide"))
    .returning({ id: update9987Guides.id, slug: update9987Guides.slug });

  if (result.length > 0) {
  } else {
  }

  process.exit(0);
}

updateRomeGuide().catch(err => {
  process.exit(1);
});
