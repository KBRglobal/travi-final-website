/**
 * Email Template Builder
 * Visual template system with blocks for building newsletter emails
 */

import { db } from "../../db";
import {
  emailTemplates,
  emailTemplateBlocks,
  type EmailTemplate,
  type EmailTemplateBlock,
  type InsertEmailTemplate,
  type InsertEmailTemplateBlock,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// ============================================================================
// TEMPLATE BLOCK TYPES
// ============================================================================

export interface TemplateBlockContent {
  // Header block
  logo?: string;
  logoAlt?: string;
  logoLink?: string;
  
  // Text block
  text?: string;
  heading?: string;
  
  // Image block
  imageUrl?: string;
  imageAlt?: string;
  imageLink?: string;
  
  // Button block
  buttonText?: string;
  buttonLink?: string;
  
  // Divider block
  dividerStyle?: "solid" | "dotted" | "dashed";
  
  // Footer block
  companyName?: string;
  address?: string;
  unsubscribeLink?: string;
  socialLinks?: { platform: string; url: string }[];
}

export interface TemplateBlockStyles {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: "left" | "center" | "right";
  padding?: string;
  margin?: string;
  borderRadius?: string;
  buttonColor?: string;
  buttonTextColor?: string;
}

// ============================================================================
// PRE-BUILT TEMPLATES
// ============================================================================

export const prebuiltTemplates = {
  welcome: {
    name: "Welcome Email",
    description: "Greet new subscribers with a warm welcome",
    category: "welcome",
    blocks: [
      {
        type: "header",
        order: 0,
        content: {
          logo: "{{company_logo}}",
          logoAlt: "{{company_name}}",
          logoLink: "{{website_url}}",
        },
        styles: {
          backgroundColor: "#ffffff",
          padding: "20px",
          textAlign: "center" as const,
        },
      },
      {
        type: "text",
        order: 1,
        content: {
          heading: "Welcome to {{company_name}}!",
          text: "Hi {{name}}, we're thrilled to have you join our community. Get ready for exclusive content, special offers, and insider tips delivered straight to your inbox.",
        },
        styles: {
          padding: "40px 20px",
          textAlign: "center" as const,
        },
      },
      {
        type: "button",
        order: 2,
        content: {
          buttonText: "Explore Now",
          buttonLink: "{{website_url}}",
        },
        styles: {
          buttonColor: "#0066cc",
          buttonTextColor: "#ffffff",
          textAlign: "center" as const,
          padding: "20px",
        },
      },
      {
        type: "footer",
        order: 3,
        content: {
          companyName: "{{company_name}}",
          address: "{{company_address}}",
          unsubscribeLink: "{{unsubscribe_link}}",
        },
        styles: {
          backgroundColor: "#f5f5f5",
          padding: "20px",
          fontSize: "12px",
          textColor: "#666666",
        },
      },
    ],
  },
  
  promotional: {
    name: "Promotional Email",
    description: "Showcase special offers and deals",
    category: "promotional",
    blocks: [
      {
        type: "header",
        order: 0,
        content: {
          logo: "{{company_logo}}",
          logoAlt: "{{company_name}}",
          logoLink: "{{website_url}}",
        },
        styles: {
          backgroundColor: "#0066cc",
          padding: "20px",
          textAlign: "center" as const,
        },
      },
      {
        type: "image",
        order: 1,
        content: {
          imageUrl: "{{hero_image}}",
          imageAlt: "Special Offer",
          imageLink: "{{offer_url}}",
        },
        styles: {
          padding: "0",
        },
      },
      {
        type: "text",
        order: 2,
        content: {
          heading: "Limited Time Offer!",
          text: "Don't miss out on our exclusive deals. Save up to 50% on selected items. Offer valid until {{expiry_date}}.",
        },
        styles: {
          padding: "30px 20px",
          textAlign: "center" as const,
        },
      },
      {
        type: "button",
        order: 3,
        content: {
          buttonText: "Shop Now",
          buttonLink: "{{shop_url}}",
        },
        styles: {
          buttonColor: "#ff6600",
          buttonTextColor: "#ffffff",
          textAlign: "center" as const,
          padding: "20px",
        },
      },
      {
        type: "footer",
        order: 4,
        content: {
          companyName: "{{company_name}}",
          unsubscribeLink: "{{unsubscribe_link}}",
        },
        styles: {
          backgroundColor: "#f5f5f5",
          padding: "20px",
          fontSize: "12px",
        },
      },
    ],
  },
  
  digest: {
    name: "Content Digest",
    description: "Curated content roundup for subscribers",
    category: "digest",
    blocks: [
      {
        type: "header",
        order: 0,
        content: {
          logo: "{{company_logo}}",
          logoAlt: "{{company_name}}",
          logoLink: "{{website_url}}",
        },
        styles: {
          backgroundColor: "#ffffff",
          padding: "20px",
          textAlign: "center" as const,
        },
      },
      {
        type: "text",
        order: 1,
        content: {
          heading: "This Week's Top Stories",
          text: "Here's what you might have missed this week. Catch up on the latest articles, guides, and updates.",
        },
        styles: {
          padding: "30px 20px 10px 20px",
        },
      },
      {
        type: "divider",
        order: 2,
        content: {
          dividerStyle: "solid",
        },
        styles: {
          padding: "10px 20px",
        },
      },
      {
        type: "text",
        order: 3,
        content: {
          text: "{{content_list}}", // Will be populated with article list
        },
        styles: {
          padding: "10px 20px",
        },
      },
      {
        type: "button",
        order: 4,
        content: {
          buttonText: "Read More",
          buttonLink: "{{blog_url}}",
        },
        styles: {
          buttonColor: "#0066cc",
          buttonTextColor: "#ffffff",
          textAlign: "center" as const,
          padding: "20px",
        },
      },
      {
        type: "footer",
        order: 5,
        content: {
          companyName: "{{company_name}}",
          unsubscribeLink: "{{unsubscribe_link}}",
        },
        styles: {
          backgroundColor: "#f5f5f5",
          padding: "20px",
          fontSize: "12px",
        },
      },
    ],
  },
  
  announcement: {
    name: "Announcement Email",
    description: "Important updates and announcements",
    category: "announcement",
    blocks: [
      {
        type: "header",
        order: 0,
        content: {
          logo: "{{company_logo}}",
          logoAlt: "{{company_name}}",
          logoLink: "{{website_url}}",
        },
        styles: {
          backgroundColor: "#ffffff",
          padding: "20px",
          textAlign: "center" as const,
        },
      },
      {
        type: "text",
        order: 1,
        content: {
          heading: "Important Announcement",
          text: "We have exciting news to share with you. {{announcement_text}}",
        },
        styles: {
          padding: "40px 20px",
          backgroundColor: "#fffbea",
          borderRadius: "8px",
          margin: "20px",
        },
      },
      {
        type: "button",
        order: 2,
        content: {
          buttonText: "Learn More",
          buttonLink: "{{announcement_url}}",
        },
        styles: {
          buttonColor: "#0066cc",
          buttonTextColor: "#ffffff",
          textAlign: "center" as const,
          padding: "20px",
        },
      },
      {
        type: "footer",
        order: 3,
        content: {
          companyName: "{{company_name}}",
          unsubscribeLink: "{{unsubscribe_link}}",
        },
        styles: {
          backgroundColor: "#f5f5f5",
          padding: "20px",
          fontSize: "12px",
        },
      },
    ],
  },
};

// ============================================================================
// TEMPLATE BUILDER FUNCTIONS
// ============================================================================

/**
 * Create a new template
 */
export async function createTemplate(
  data: Omit<InsertEmailTemplate, "isPrebuilt">
): Promise<EmailTemplate> {
  const [template] = await db
    .insert(emailTemplates)
    .values({
      ...data,
      isPrebuilt: false,
    })
    .returning();
  
  return template;
}

/**
 * Create a template from a pre-built template
 */
export async function createFromPrebuilt(
  templateKey: keyof typeof prebuiltTemplates,
  userId: string
): Promise<EmailTemplate> {
  const prebuilt = prebuiltTemplates[templateKey];
  
  // Create template
  const [template] = await db
    .insert(emailTemplates)
    .values({
      name: prebuilt.name,
      description: prebuilt.description,
      category: prebuilt.category,
      isPrebuilt: true,
      createdBy: userId,
    })
    .returning();
  
  // Create blocks
  for (const block of prebuilt.blocks) {
    await db.insert(emailTemplateBlocks).values({
      templateId: template.id,
      type: block.type,
      order: block.order,
      content: block.content,
      styles: block.styles,
    });
  }
  
  return template;
}

/**
 * Get template by ID with blocks
 */
export async function getTemplateWithBlocks(
  templateId: string
): Promise<(EmailTemplate & { blocks: EmailTemplateBlock[] }) | null> {
  const template = await db.query.emailTemplates.findFirst({
    where: eq(emailTemplates.id, templateId),
  });
  
  if (!template) return null;
  
  const blocks = await db
    .select()
    .from(emailTemplateBlocks)
    .where(eq(emailTemplateBlocks.templateId, templateId))
    .orderBy(emailTemplateBlocks.order);
  
  return { ...template, blocks };
}

/**
 * Get all templates
 */
export async function getTemplates(): Promise<EmailTemplate[]> {
  return db
    .select()
    .from(emailTemplates)
    .orderBy(desc(emailTemplates.createdAt));
}

/**
 * Update template
 */
export async function updateTemplate(
  templateId: string,
  data: Partial<InsertEmailTemplate>
): Promise<EmailTemplate | null> {
  const [updated] = await db
    .update(emailTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(emailTemplates.id, templateId))
    .returning();
  
  return updated || null;
}

/**
 * Delete template
 */
export async function deleteTemplate(templateId: string): Promise<boolean> {
  const result = await db
    .delete(emailTemplates)
    .where(eq(emailTemplates.id, templateId));
  
  return (result.rowCount ?? 0) > 0;
}

/**
 * Add block to template
 */
export async function addBlock(
  templateId: string,
  data: Omit<InsertEmailTemplateBlock, "templateId">
): Promise<EmailTemplateBlock> {
  const [block] = await db
    .insert(emailTemplateBlocks)
    .values({
      templateId,
      ...data,
    })
    .returning();
  
  return block;
}

/**
 * Update block
 */
export async function updateBlock(
  blockId: string,
  data: Partial<InsertEmailTemplateBlock>
): Promise<EmailTemplateBlock | null> {
  const [updated] = await db
    .update(emailTemplateBlocks)
    .set(data)
    .where(eq(emailTemplateBlocks.id, blockId))
    .returning();
  
  return updated || null;
}

/**
 * Delete block
 */
export async function deleteBlock(blockId: string): Promise<boolean> {
  const result = await db
    .delete(emailTemplateBlocks)
    .where(eq(emailTemplateBlocks.id, blockId));
  
  return (result.rowCount ?? 0) > 0;
}

/**
 * Reorder blocks in a template
 */
export async function reorderBlocks(
  templateId: string,
  blockIds: string[]
): Promise<void> {
  for (let i = 0; i < blockIds.length; i++) {
    await db
      .update(emailTemplateBlocks)
      .set({ order: i })
      .where(eq(emailTemplateBlocks.id, blockIds[i]));
  }
}

/**
 * Duplicate template
 */
export async function duplicateTemplate(
  templateId: string,
  userId: string
): Promise<EmailTemplate> {
  const original = await getTemplateWithBlocks(templateId);
  if (!original) {
    throw new Error("Template not found");
  }
  
  // Create new template
  const [newTemplate] = await db
    .insert(emailTemplates)
    .values({
      name: `${original.name} (Copy)`,
      description: original.description,
      category: original.category,
      isPrebuilt: false,
      createdBy: userId,
    })
    .returning();
  
  // Duplicate blocks
  for (const block of original.blocks) {
    await db.insert(emailTemplateBlocks).values({
      templateId: newTemplate.id,
      type: block.type,
      order: block.order,
      content: block.content,
      styles: block.styles,
    });
  }
  
  return newTemplate;
}
