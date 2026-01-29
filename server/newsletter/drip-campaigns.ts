/**
 * Newsletter Drip Campaigns & Behavioral Triggers
 * Multi-step email sequences and event-based automation
 */

import { db } from "../db";
import {
  dripCampaigns,
  dripCampaignSteps,
  dripCampaignEnrollments,
  behavioralTriggers,
  newsletterSubscribers,
  analyticsEvents,
  type DripCampaign,
  type DripCampaignStep,
  type DripCampaignEnrollment,
  type BehavioralTrigger,
  type InsertDripCampaign,
  type InsertDripCampaignStep,
  type InsertDripCampaignEnrollment,
  type InsertBehavioralTrigger,
} from "@shared/schema";
import { eq, desc, and, lte } from "drizzle-orm";
import { Resend } from "resend";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromEmail(): string {
  return process.env.NEWSLETTER_FROM_EMAIL || "noreply@travi.world";
}

// ============================================================================
// DRIP CAMPAIGNS
// ============================================================================

/**
 * Create drip campaign
 */
export async function createDripCampaign(data: InsertDripCampaign): Promise<DripCampaign> {
  const [campaign] = await db
    .insert(dripCampaigns)
    .values(data as any)
    .returning();
  return campaign;
}

/**
 * Get all drip campaigns
 */
export async function getDripCampaigns(): Promise<DripCampaign[]> {
  return db.select().from(dripCampaigns).orderBy(desc(dripCampaigns.createdAt));
}

/**
 * Get drip campaign with steps
 */
export async function getDripCampaignWithSteps(
  campaignId: string
): Promise<(DripCampaign & { steps: DripCampaignStep[] }) | null> {
  const [campaign] = await db
    .select()
    .from(dripCampaigns)
    .where(eq(dripCampaigns.id, campaignId))
    .limit(1);
  if (!campaign) return null;

  const steps = await db
    .select()
    .from(dripCampaignSteps)
    .where(eq(dripCampaignSteps.campaignId, campaignId))
    .orderBy(dripCampaignSteps.stepNumber);
  return { ...campaign, steps };
}

/**
 * Update drip campaign
 */
export async function updateDripCampaign(
  campaignId: string,
  data: Partial<InsertDripCampaign>
): Promise<DripCampaign | null> {
  const [updated] = await db
    .update(dripCampaigns)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(dripCampaigns.id, campaignId))
    .returning();
  return updated || null;
}

/**
 * Delete drip campaign
 */
export async function deleteDripCampaign(campaignId: string): Promise<boolean> {
  const result = await db.delete(dripCampaigns).where(eq(dripCampaigns.id, campaignId));
  return (result.rowCount ?? 0) > 0;
}

/**
 * Add step to campaign
 */
export async function addCampaignStep(
  campaignId: string,
  data: Omit<InsertDripCampaignStep, "campaignId">
): Promise<DripCampaignStep> {
  const [step] = await db
    .insert(dripCampaignSteps)
    .values({ campaignId, ...data } as any)
    .returning();
  return step;
}

/**
 * Update campaign step
 */
export async function updateCampaignStep(
  stepId: string,
  data: Partial<InsertDripCampaignStep>
): Promise<DripCampaignStep | null> {
  const [updated] = await db
    .update(dripCampaignSteps)
    .set(data)
    .where(eq(dripCampaignSteps.id, stepId))
    .returning();
  return updated || null;
}

/**
 * Delete campaign step
 */
export async function deleteCampaignStep(stepId: string): Promise<boolean> {
  const result = await db.delete(dripCampaignSteps).where(eq(dripCampaignSteps.id, stepId));
  return (result.rowCount ?? 0) > 0;
}

/**
 * Enroll subscriber in campaign
 */
export async function enrollSubscriber(
  campaignId: string,
  subscriberId: string
): Promise<DripCampaignEnrollment> {
  const campaign = await getDripCampaignWithSteps(campaignId);
  if (!campaign || campaign.steps.length === 0) {
    throw new Error("Campaign not found or has no steps");
  }

  // Calculate next email time based on first step
  const firstStep = campaign.steps[0];
  const nextEmailAt = calculateNextEmailTime(firstStep.delayAmount, firstStep.delayUnit);

  const [enrollment] = await db
    .insert(dripCampaignEnrollments)
    .values({
      campaignId,
      subscriberId,
      currentStep: 0,
      nextEmailAt,
      status: "active",
    } as any)
    .returning();

  // Increment campaign enrollment count
  await db
    .update(dripCampaigns)
    .set({
      enrollmentCount: (campaign.enrollmentCount || 0) + 1,
      updatedAt: new Date(),
    } as any)
    .where(eq(dripCampaigns.id, campaignId));

  return enrollment;
}

/**
 * Calculate next email time
 */
function calculateNextEmailTime(amount: number, unit: string): Date {
  const now = new Date();
  switch (unit) {
    case "hours":
      return new Date(now.getTime() + amount * 60 * 60 * 1000);
    case "days":
      return new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
    case "weeks":
      return new Date(now.getTime() + amount * 7 * 24 * 60 * 60 * 1000);
    default:
      return now;
  }
}

/**
 * Process due drip emails
 */
export async function processDueEmails(): Promise<number> {
  const now = new Date();

  // Get enrollments with due emails
  const dueEnrollments = await db
    .select()
    .from(dripCampaignEnrollments)
    .where(
      and(
        eq(dripCampaignEnrollments.status, "active"),
        lte(dripCampaignEnrollments.nextEmailAt, now)
      )
    );

  let processed = 0;

  for (const enrollment of dueEnrollments) {
    const campaign = await getDripCampaignWithSteps(enrollment.campaignId);
    if (!campaign) continue;

    const currentStepIndex = enrollment.currentStep || 0;
    const step = campaign.steps[currentStepIndex];
    if (!step) continue;

    // Look up subscriber email from enrollment
    const [subscriber] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.id, enrollment.subscriberId))
      .limit(1);

    if (subscriber) {
      const resend = getResendClient();
      if (resend) {
        try {
          await resend.emails.send({
            from: getFromEmail(),
            to: subscriber.email,
            subject: (step as any).subject || campaign.name,
            html: (step as any).htmlContent || (step as any).content || "",
          });
        } catch (emailError) {
          console.error(`Failed to send drip email to ${subscriber.email}:`, emailError);
          continue;
        }
      }
    }

    // Move to next step
    const nextStepIndex = currentStepIndex + 1;

    if (nextStepIndex >= campaign.steps.length) {
      // Campaign complete
      await db
        .update(dripCampaignEnrollments)
        .set({
          status: "completed",
          completedAt: now,
          currentStep: nextStepIndex,
        } as any)
        .where(eq(dripCampaignEnrollments.id, enrollment.id));
    } else {
      // Schedule next email
      const nextStep = campaign.steps[nextStepIndex];
      const nextEmailAt = calculateNextEmailTime(nextStep.delayAmount, nextStep.delayUnit);

      await db
        .update(dripCampaignEnrollments)
        .set({
          currentStep: nextStepIndex,
          nextEmailAt,
        } as any)
        .where(eq(dripCampaignEnrollments.id, enrollment.id));
    }

    processed++;
  }

  return processed;
}

// ============================================================================
// BEHAVIORAL TRIGGERS
// ============================================================================

/**
 * Create behavioral trigger
 */
export async function createBehavioralTrigger(
  data: InsertBehavioralTrigger
): Promise<BehavioralTrigger> {
  const [trigger] = await db
    .insert(behavioralTriggers)
    .values(data as any)
    .returning();
  return trigger;
}

/**
 * Get all behavioral triggers
 */
export async function getBehavioralTriggers(): Promise<BehavioralTrigger[]> {
  return db.select().from(behavioralTriggers).orderBy(desc(behavioralTriggers.createdAt));
}

/**
 * Get behavioral trigger by ID
 */
export async function getBehavioralTrigger(triggerId: string): Promise<BehavioralTrigger | null> {
  const [trigger] = await db
    .select()
    .from(behavioralTriggers)
    .where(eq(behavioralTriggers.id, triggerId))
    .limit(1);
  return trigger || null;
}

/**
 * Update behavioral trigger
 */
export async function updateBehavioralTrigger(
  triggerId: string,
  data: Partial<InsertBehavioralTrigger>
): Promise<BehavioralTrigger | null> {
  const [updated] = await db
    .update(behavioralTriggers)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(behavioralTriggers.id, triggerId))
    .returning();
  return updated || null;
}

/**
 * Delete behavioral trigger
 */
export async function deleteBehavioralTrigger(triggerId: string): Promise<boolean> {
  const result = await db.delete(behavioralTriggers).where(eq(behavioralTriggers.id, triggerId));
  return (result.rowCount ?? 0) > 0;
}

/**
 * Check trigger conditions against event
 */
function checkTriggerConditions(trigger: BehavioralTrigger, event: any): boolean {
  const conditions = trigger.eventConditions;

  // Simple matching for now - can be extended
  for (const [key, value] of Object.entries(conditions)) {
    if (event[key] !== value) {
      return false;
    }
  }

  return true;
}

/**
 * Process event for behavioral triggers
 */
export async function processEventForTriggers(event: {
  eventType: string;
  visitorId: string;
  metadata?: Record<string, any>;
}): Promise<number> {
  // Get active triggers for this event type
  const triggers = await db
    .select()
    .from(behavioralTriggers)
    .where(
      and(eq(behavioralTriggers.eventType, event.eventType), eq(behavioralTriggers.isActive, true))
    );

  let triggered = 0;

  for (const trigger of triggers) {
    if (!checkTriggerConditions(trigger, event)) continue;

    // Check cooldown period
    // TODO: Track last trigger time per subscriber

    // Get subscriber
    const [subscriber] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.id, event.visitorId))
      .limit(1);

    if (!subscriber) continue;

    const resend = getResendClient();
    if (resend) {
      try {
        await resend.emails.send({
          from: getFromEmail(),
          to: subscriber.email,
          subject: (trigger as any).emailSubject || "TRAVI Update",
          html: (trigger as any).emailContent || "",
        });
      } catch (emailError) {
        console.error(
          `Failed to send behavioral trigger email to ${subscriber.email}:`,
          emailError
        );
        continue;
      }
    }

    // Increment trigger count
    await db
      .update(behavioralTriggers)
      .set({
        triggerCount: (trigger.triggerCount || 0) + 1,
        updatedAt: new Date(),
      } as any)
      .where(eq(behavioralTriggers.id, trigger.id));

    triggered++;
  }

  return triggered;
}
