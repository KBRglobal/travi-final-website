import { eq, desc, sql, and, db, otpCodes, type OtpCode, type InsertOtpCode } from "./base";

export class OtpStorage {
  async createOtpCode(data: InsertOtpCode): Promise<OtpCode> {
    const [code] = await db
      .insert(otpCodes)
      .values(data as any)
      .returning();
    return code;
  }

  async getValidOtpCode(email: string, code: string): Promise<OtpCode | undefined> {
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          sql`LOWER(${otpCodes.email}) = LOWER(${email})`,
          eq(otpCodes.code, code),
          eq(otpCodes.used, false),
          sql`${otpCodes.expiresAt} > NOW()`
        )
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    return otp;
  }

  async markOtpAsUsed(id: string): Promise<void> {
    await db
      .update(otpCodes)
      .set({ used: true } as any)
      .where(eq(otpCodes.id, id));
  }
}

export const otpStorage = new OtpStorage();
