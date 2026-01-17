import { db } from "../db";
import { tiqetsAttractions } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const BATCH_SIZE = 100;

const PRICE_PATTERNS = [
  /AED\s*\d+[\d,.-]*/gi,
  /USD\s*\d+[\d,.-]*/gi,
  /\$\s*\d+[\d,.-]*/gi,
  /\d+\s*AED/gi,
  /\d+\s*USD/gi,
  /\d+\s*dirhams?/gi,
  /Fare:\s*[^.]+\./gi,
  /Cost:\s*[^.]+\./gi,
  /Approximate fare:[^.]+\./gi,
  /prices?\s+vary/gi,
  /pricing\s+varies/gi,
  /\bdirhams?\b/gi,
  /\bUSD\b/gi,
  /\bAED\b/gi,
];

const TEXT_REPLACEMENTS: [RegExp, string][] = [
  [/best prices/gi, "best availability"],
  [/gate prices/gi, "walk-up tickets"],
  [/prices/gi, "availability"],
  [/cheaper/gi, "less crowded"],
  [/save \d+%/gi, "skip the line"],
  [/save money/gi, "plan ahead"],
  [/\bfare\b/gi, "transport"],
  [/Check Availability & Prices/gi, "Check Availability"],
  [/Prices, Best Time/gi, "Best Time"],
  [/find the best prices/gi, "plan your visit"],
];

function sanitizeText(text: string, maxLength?: number): string {
  if (typeof text !== "string") return text;
  
  let result = text;
  
  for (const pattern of PRICE_PATTERNS) {
    result = result.replace(pattern, "");
  }
  
  for (const [pattern, replacement] of TEXT_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  
  result = result.replace(/\s{2,}/g, " ").trim();
  result = result.replace(/\.\s*\./g, ".");
  result = result.replace(/,\s*\./g, ".");
  
  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength - 3) + "...";
  }
  
  return result;
}

function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === "string") {
    return sanitizeText(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value);
    }
    return result;
  }
  
  return obj;
}

function hasPrice(text: string): boolean {
  if (typeof text !== "string") return false;
  return /AED|USD|\$\d|dirham|fare:|cost:/i.test(text);
}

function objectHasPrice(obj: unknown): boolean {
  if (obj === null || obj === undefined) return false;
  
  if (typeof obj === "string") {
    return hasPrice(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.some(item => objectHasPrice(item));
  }
  
  if (typeof obj === "object") {
    return Object.values(obj).some(value => objectHasPrice(value));
  }
  
  return false;
}

async function run() {
  console.log("🚀 Starting price sanitization for tiqets_attractions...");
  
  const countResult = await db.execute(sql`
    SELECT COUNT(*) as count FROM tiqets_attractions 
    WHERE status = 'published'
    AND (ai_content::text ~* '\mAED\M' 
      OR ai_content::text ~* '\mUSD\M'
      OR ai_content::text ~* '\mdirham'
      OR ai_content::text ILIKE '%fare:%'
      OR ai_content::text ILIKE '%cost:%'
      OR ai_content::text ~* '\mprices?\M')
  `);
  
  const totalToProcess = parseInt(String((countResult.rows[0] as any)?.count || 0));
  console.log(`📊 Found ${totalToProcess} attractions with price references to clean`);
  
  let processed = 0;
  let updated = 0;
  let errors = 0;
  let maxIterations = 50;
  let iteration = 0;
  
  while (iteration < maxIterations) {
    iteration++;
    
    const attractions = await db.select({
      id: tiqetsAttractions.id,
      title: tiqetsAttractions.title,
      aiContent: tiqetsAttractions.aiContent,
      metaTitle: tiqetsAttractions.metaTitle,
      metaDescription: tiqetsAttractions.metaDescription,
    })
    .from(tiqetsAttractions)
    .where(sql`
      status = 'published'
      AND (ai_content::text ~* '\mAED\M' 
        OR ai_content::text ~* '\mUSD\M'
        OR ai_content::text ~* '\mdirham'
        OR ai_content::text ILIKE '%fare:%'
        OR ai_content::text ILIKE '%cost:%'
        OR ai_content::text ~* '\mprices?\M')
    `)
    .limit(BATCH_SIZE);
    
    if (attractions.length === 0) {
      console.log("✅ No more records with price references found!");
      break;
    }
    
    console.log(`📋 Batch ${iteration}: Processing ${attractions.length} records...`);
    
    for (const attraction of attractions) {
      try {
        const sanitizedAiContent = sanitizeObject(attraction.aiContent);
        const sanitizedMetaTitle = sanitizeText(attraction.metaTitle || "", 60);
        const sanitizedMetaDesc = sanitizeText(attraction.metaDescription || "", 160);
        
        await db.update(tiqetsAttractions)
          .set({
            aiContent: sanitizedAiContent,
            metaTitle: sanitizedMetaTitle || null,
            metaDescription: sanitizedMetaDesc || null,
            updatedAt: new Date(),
          } as any)
          .where(eq(tiqetsAttractions.id, attraction.id));
        
        updated++;
        processed++;
      } catch (err) {
        console.error(`❌ Error processing ${attraction.id}:`, err);
        errors++;
        processed++;
      }
    }
    
    console.log(`✅ Batch ${iteration} complete: ${updated} updated, ${errors} errors`);
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("🎉 SANITIZATION COMPLETE!");
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log("=".repeat(50));
  
  const verifyResult = await db.execute(sql`
    SELECT COUNT(*) as count FROM tiqets_attractions 
    WHERE status = 'published'
    AND (ai_content::text ~* '\mAED\M' 
      OR ai_content::text ~* '\mUSD\M'
      OR ai_content::text ~* '\mdirham')
  `);
  
  const remaining = parseInt(String((verifyResult.rows[0] as any)?.count || 0));
  if (remaining === 0) {
    console.log("✅ VERIFIED: No price references remaining!");
  } else {
    console.log(`⚠️ Warning: ${remaining} records still have price references`);
  }
}

run().catch(console.error).finally(() => process.exit(0));
