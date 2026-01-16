import { useEffect } from "react";

export function useReferralTracking() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");

    if (refCode) {
      localStorage.setItem("referral_code", refCode);
      
      fetch("/api/referrals/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: refCode,
          landingPage: window.location.pathname,
        }),
      }).catch(() => {
      });
    }
  }, []);
}

export function getReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("referral_code");
}

export function clearReferralCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("referral_code");
}
