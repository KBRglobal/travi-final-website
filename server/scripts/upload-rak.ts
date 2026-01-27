import { db } from "../db.js";
import { update9987Guides } from "@shared/schema.js";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const filePath = join(__dirname, "../data/ras-al-khaimah-guide-full-content.html");
  const content = readFileSync(filePath, "utf-8");

  const result = await db
    .update(update9987Guides)
    .set({
      rewrittenContent: content,
      metaTitle: "Ras al-Khaimah Travel Guide 2026: Beaches, Adventure | TRAVI",
      metaDescription:
        "Discover RAK 2026: world longest zipline, pristine beaches, resorts 30-50% less than Dubai.",
      focusKeyword: "Ras al-Khaimah travel guide 2026",
      status: "published",
      updatedAt: new Date(),
    } as any)
    .where(eq(update9987Guides.slug, "ras-al-khaimah-travel-guide"))
    .returning({ id: update9987Guides.id });

  if (result.length > 0) {
  } else {
  }
  process.exit(0);
}

main().catch(err => {
  process.exit(1);
});
