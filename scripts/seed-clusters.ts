/**
 * Seed Content Clusters
 * Creates initial clusters for Dubai travel content organization
 */

import { db } from "../server/db";
import { contentClusters, clusterMembers, contents } from "../shared/schema";
import { eq, like, or } from "drizzle-orm";

const INITIAL_CLUSTERS = [
  {
    name: "Dubai Attractions",
    slug: "dubai-attractions",
    description: "Complete guide to Dubai's top attractions, landmarks, and must-visit places. From Burj Khalifa to Dubai Mall.",
    primaryKeyword: "dubai attractions",
    color: "blue",
    contentKeywords: ["burj khalifa", "dubai mall", "palm", "museum", "frame", "aquarium", "safari"],
  },
  {
    name: "Dubai Hotels & Resorts",
    slug: "dubai-hotels",
    description: "Comprehensive guide to Dubai's best hotels, from luxury resorts to budget-friendly options.",
    primaryKeyword: "dubai hotels",
    color: "purple",
    contentKeywords: ["hotel", "resort", "stay", "accommodation"],
  },
  {
    name: "Dubai Dining Guide",
    slug: "dubai-dining",
    description: "Explore Dubai's culinary scene - from fine dining restaurants to local eateries and street food.",
    primaryKeyword: "dubai restaurants",
    color: "orange",
    contentKeywords: ["restaurant", "dining", "food", "cafe", "brunch"],
  },
  {
    name: "Dubai Beaches & Water Activities",
    slug: "dubai-beaches",
    description: "Guide to Dubai's beautiful beaches, water parks, and marine activities.",
    primaryKeyword: "dubai beaches",
    color: "teal",
    contentKeywords: ["beach", "water", "aquaventure", "jumeirah", "marina"],
  },
  {
    name: "Dubai Shopping",
    slug: "dubai-shopping",
    description: "Ultimate shopping guide - from luxury malls to traditional souks.",
    primaryKeyword: "dubai shopping",
    color: "pink",
    contentKeywords: ["mall", "shopping", "souk", "gold", "market"],
  },
  {
    name: "Dubai Neighborhoods",
    slug: "dubai-neighborhoods",
    description: "Explore Dubai's diverse districts - Downtown, Marina, JBR, Old Dubai, and more.",
    primaryKeyword: "dubai areas",
    color: "green",
    contentKeywords: ["downtown", "marina", "jbr", "deira", "bur dubai", "district"],
  },
  {
    name: "Getting Around Dubai",
    slug: "dubai-transport",
    description: "Complete guide to transportation in Dubai - metro, taxi, buses, and getting from the airport.",
    primaryKeyword: "dubai transportation",
    color: "blue",
    contentKeywords: ["metro", "taxi", "transport", "airport", "bus"],
  },
  {
    name: "Dubai Events & Festivals",
    slug: "dubai-events",
    description: "Stay updated on Dubai's events, festivals, and seasonal celebrations.",
    primaryKeyword: "dubai events",
    color: "purple",
    contentKeywords: ["event", "festival", "expo", "celebration", "concert"],
  },
];

async function seedClusters() {
  console.log("🌱 Starting Content Clusters seeding...\n");

  let clustersCreated = 0;
  let membersAdded = 0;

  for (const clusterData of INITIAL_CLUSTERS) {
    // Check if cluster already exists
    const existing = await db.select().from(contentClusters)
      .where(eq(contentClusters.slug, clusterData.slug))
      .limit(1);

    if (existing.length > 0) {
      console.log(`⏭️ Cluster "${clusterData.name}" already exists, skipping...`);
      continue;
    }

    // Create the cluster
    const [cluster] = await db.insert(contentClusters).values({
      name: clusterData.name,
      slug: clusterData.slug,
      description: clusterData.description,
      primaryKeyword: clusterData.primaryKeyword,
      color: clusterData.color,
    }).returning();

    clustersCreated++;
    console.log(`✅ Created cluster: ${clusterData.name}`);

    // Find and add related content to the cluster
    const relatedContent = await findRelatedContent(clusterData.contentKeywords);

    let position = 0;
    for (const content of relatedContent) {
      // Check if content is already in this cluster
      const existingMember = await db.select().from(clusterMembers)
        .where(eq(clusterMembers.contentId, content.id))
        .where(eq(clusterMembers.clusterId, cluster.id))
        .limit(1);

      if (existingMember.length > 0) continue;

      await db.insert(clusterMembers).values({
        clusterId: cluster.id,
        contentId: content.id,
        position: position++,
      });
      membersAdded++;
    }

    console.log(`   Added ${relatedContent.length} content items to cluster\n`);

    // Set pillar content (first matching content as pillar)
    if (relatedContent.length > 0) {
      await db.update(contentClusters)
        .set({ pillarContentId: relatedContent[0].id })
        .where(eq(contentClusters.id, cluster.id));
    }
  }

  console.log(`\n🎉 Seeding complete!`);
  console.log(`   Clusters created: ${clustersCreated}`);
  console.log(`   Members added: ${membersAdded}`);
}

async function findRelatedContent(keywords: string[]) {
  // Build OR conditions for keyword matching
  const conditions = keywords.map(keyword =>
    or(
      like(contents.title, `%${keyword}%`),
      like(contents.slug, `%${keyword}%`)
    )
  );

  const matchedContent = await db.select()
    .from(contents)
    .where(or(...conditions))
    .limit(20);

  return matchedContent;
}

// Run if executed directly
seedClusters()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });

export { seedClusters };
