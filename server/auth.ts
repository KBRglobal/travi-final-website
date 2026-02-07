import { Resend } from "resend";
import { storage } from "./storage";
import type { User } from "@shared/schema";

let connectionSettings: any;

async function getResendCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("Replit token not found");
  }

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    }
  )
    .then(res => res.json())
    .then(data => data.items?.[0]);

  if (!connectionSettings?.settings.api_key) {
    throw new Error("Resend not connected");
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email,
  };
}

export async function getResendClient() {
  const creds = await getResendCredentials();
  return {
    client: new Resend(creds.apiKey),
    fromEmail: creds.fromEmail,
  };
}

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(email: string, code: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();

    await client.emails.send({
      from: fromEmail,
      to: email,
      subject: "Your Travi CMS Login Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0f172a;">Travi CMS Login</h2>
          <p>Your one-time verification code is:</p>
          <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${code}</span>
          </div>
          <p style="color: #64748b;">This code will expire in 10 minutes.</p>
          <p style="color: #64748b;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    return true;
  } catch (error) {
    return false;
  }
}

export async function requestOtp(email: string): Promise<{ success: boolean; message: string }> {
  const user = await storage.getUserByEmail(email);

  if (!user) {
    return { success: false, message: "No account found with this email address" };
  }

  if (!user.isActive) {
    return { success: false, message: "This account has been deactivated" };
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    await storage.createOtpCode({
      email,
      code,
      expiresAt,
    });

    const sent = await sendOtpEmail(email, code);

    if (!sent) {
      return { success: false, message: "Failed to send verification email" };
    }

    return { success: true, message: "Verification code sent to your email" };
  } catch (error) {
    return { success: false, message: "Failed to process OTP request" };
  }
}

export async function verifyOtp(
  email: string,
  code: string
): Promise<{ success: boolean; user?: User; message: string }> {
  const otp = await storage.getValidOtpCode(email, code);

  if (!otp) {
    return { success: false, message: "Invalid or expired verification code" };
  }

  await storage.markOtpAsUsed(otp.id);

  const user = await storage.getUserByEmail(email);

  if (!user) {
    return { success: false, message: "User not found" };
  }

  if (!user.isActive) {
    return { success: false, message: "This account has been deactivated" };
  }

  return { success: true, user, message: "Login successful" };
}
