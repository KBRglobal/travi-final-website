/**
 * Magic Link Authentication
 *
 * Passwordless email authentication system
 * - Generate secure magic links
 * - Send via email
 * - Verify and authenticate users
 */

import { db } from "../db";
import { magicLinkTokens, users } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export interface MagicLinkResult {
  success: boolean;
  message: string;
  token?: string;
}

export interface VerifyMagicLinkResult {
  success: boolean;
  email?: string;
  userId?: string;
  error?: string;
}

export const magicLinkAuth = {
  /**
   * Generate a magic link token and send email
   */
  async sendMagicLink(email: string, baseUrl: string): Promise<MagicLinkResult> {
    try {
      // Validate email
      if (!email || !email.includes("@")) {
        return { success: false, message: "Invalid email address" };
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MS);

      // Store token in database
      await db.insert(magicLinkTokens).values({
        email: email.toLowerCase(),
        token,
        expiresAt,
        used: false,
      } as any);

      // Generate magic link
      const magicLink = `${baseUrl}/auth/verify?token=${token}`;

      // Send email
      if (resend) {
        await resend.emails.send({
          from: process.env.FROM_EMAIL || "noreply@traviapp.com",
          to: email,
          subject: "Your Magic Link to Sign In",
          html: `
            <h2>Sign in to Traviapp</h2>
            <p>Click the link below to sign in to your account. This link will expire in 15 minutes.</p>
            <p><a href="${magicLink}">Sign In Now</a></p>
            <p>If you didn't request this link, you can safely ignore this email.</p>
            <p style="color: #666; font-size: 12px;">Link: ${magicLink}</p>
          `,
        });
      } else {
      }

      return {
        success: true,
        message: "Magic link sent to your email",
        token, // Only for testing purposes
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to send magic link",
      };
    }
  },

  /**
   * Verify magic link token and authenticate user
   */
  async verifyMagicLink(token: string): Promise<VerifyMagicLinkResult> {
    try {
      // Find token in database
      const tokenRecord = await db
        .select()
        .from(magicLinkTokens)
        .where(
          and(
            eq(magicLinkTokens.token, token),
            eq(magicLinkTokens.used, false),
            gt(magicLinkTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (tokenRecord.length === 0) {
        return {
          success: false,
          error: "Invalid or expired magic link",
        };
      }

      const { email } = tokenRecord[0];

      // Mark token as used
      await db
        .update(magicLinkTokens)
        .set({ used: true } as any)
        .where(eq(magicLinkTokens.token, token));

      // Find or create user
      let user = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (user.length === 0) {
        // Create new user
        const newUser = await db
          .insert(users)
          .values({
            email,
            name: email.split("@")[0],
            role: "viewer",
            isActive: true,
          })
          .returning();

        user = newUser;
      }

      return {
        success: true,
        email,
        userId: user[0].id,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to verify magic link",
      };
    }
  },

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await db
        .delete(magicLinkTokens)
        .where(gt(new Date() as any, magicLinkTokens.expiresAt));

      return result.rowCount || 0;
    } catch (error) {
      return 0;
    }
  },
};
