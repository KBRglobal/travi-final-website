import { db } from "../db.js";
import { update9987Guides } from "@shared/schema.js";
import { eq } from "drizzle-orm";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GUIDES_TO_UPLOAD = [
  {
    slug: "las-vegas-travel-guide",
    file: "las-vegas-guide-full-content.html",
    title: "Las Vegas",
    metaTitle: "Las Vegas Travel Guide 2026: Shows, Casinos, Grand Canyon | TRAVI",
    metaDesc:
      "Discover Las Vegas in 2026: real costs, best shows, Grand Canyon trips. Budget from $100/day.",
    keyword: "Las Vegas travel guide 2026",
  },
  {
    slug: "ras-al-khaimah-travel-guide",
    file: "ras-al-khaimah-guide-full-content.html",
    title: "Ras al-Khaimah",
    metaTitle: "Ras al-Khaimah Travel Guide 2026: Beaches, Jebel Jais, Adventure | TRAVI",
    metaDesc:
      "Discover RAK in 2026: world longest zipline, pristine beaches, 30-50% less than Dubai.",
    keyword: "Ras al-Khaimah travel guide 2026",
  },
];

async function main() {
  for (const guide of GUIDES_TO_UPLOAD) {
    const filePath = join(__dirname, "../data", guide.file);

    if (!existsSync(filePath)) {
      continue;
    }

    const content = readFileSync(filePath, "utf-8");

    const result = await db
      .update(update9987Guides)
      .set({
        rewrittenContent: content,
        metaTitle: guide.metaTitle,
        metaDescription: guide.metaDesc,
        focusKeyword: guide.keyword,
        status: "published",
        updatedAt: new Date(),
      } as any)
      .where(eq(update9987Guides.slug, guide.slug))
      .returning({ id: update9987Guides.id });

    if (result.length > 0) {
    } else {
    }
  }

  process.exit(0);
}

main().catch(err => {
  process.exit(1);
});
