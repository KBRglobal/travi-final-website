/**
 * Magic Link Authentication - Stub Module
 */

interface MagicLinkResult {
  success: boolean;
  message?: string;
  error?: string;
  user?: {
    id: string;
    email: string;
  };
}

class MagicLinkAuth {
  async sendMagicLink(email: string, baseUrl: string): Promise<MagicLinkResult> {
    return {
      success: false,
      message: "Magic link authentication is not configured",
    };
  }

  async verifyMagicLink(token: string): Promise<MagicLinkResult> {
    return {
      success: false,
      error: "Magic link authentication is not configured",
    };
  }
}

export const magicLinkAuth = new MagicLinkAuth();
