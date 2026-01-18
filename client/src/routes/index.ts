import * as Components from "./lazy-imports";

export interface RouteDefinition {
  path: string;
  component: React.ComponentType<any>;
}

// Locale codes for URL prefixes (16 languages, English is default without prefix)
export const LOCALE_PREFIXES = [
  "ar", "hi",                    // Tier 1
  "zh", "ru", "ur", "fr",        // Tier 2
  "de", "fa", "bn", "fil",       // Tier 3
  "es", "tr", "it", "ja", "ko", "he"  // Tier 4
];

// All public routes - will be mounted with and without locale prefix
export const publicRoutes: RouteDefinition[] = [
  { path: "/login", component: Components.Login },
  { path: "/access-denied", component: Components.AccessDenied },
  { path: "/coming-soon", component: Components.ComingSoon },
  { path: "/search", component: Components.PublicSearch },
  { path: "/attractions", component: Components.Attractions },
  { path: "/attractions/:slug", component: Components.PublicContentViewer },
  { path: "/hotels", component: Components.HotelsPage },
  { path: "/hotels/:slug", component: Components.PublicContentViewer },
  { path: "/dining", component: Components.PublicDining },
  { path: "/dining/:slug", component: Components.PublicContentViewer },
  { path: "/transport/:slug", component: Components.PublicContentViewer },
  { path: "/articles", component: Components.PublicArticles },
  { path: "/articles/:slug", component: Components.PublicContentViewer },
  { path: "/events", component: Components.PublicEvents },
  { path: "/events/:slug", component: Components.PublicContentViewer },

  // Help Center
  { path: "/help", component: Components.HelpCenterPublic },
  { path: "/help/:slug", component: Components.HelpCategory },
  { path: "/help/:categorySlug/:articleSlug", component: Components.HelpArticle },

  // ============================================
  // DUBAI-SPECIFIC ROUTES (under /destinations/dubai/)
  // ============================================
  
  // Dubai Real Estate
  { path: "/destinations/dubai/real-estate", component: Components.PublicOffPlan },
  { path: "/destinations/dubai/off-plan", component: Components.PublicOffPlan },
  
  // Legacy redirects (keep for SEO, redirect to new paths)
  { path: "/dubai-real-estate", component: Components.PublicOffPlan },
  { path: "/dubai-off-plan-properties", component: Components.PublicOffPlan },
  
  // Dubai Off-Plan pages (not yet implemented)
  // { path: "/destinations/dubai/off-plan/investment-guide", component: Components.OffPlanInvestmentGuide },
  // { path: "/destinations/dubai/off-plan/how-to-buy", component: Components.OffPlanHowToBuy },
  // { path: "/destinations/dubai/off-plan/payment-plans", component: Components.OffPlanPaymentPlans },
  // { path: "/destinations/dubai/off-plan/best-projects-2026", component: Components.OffPlanBest2026 },
  // { path: "/destinations/dubai/off-plan/business-bay", component: Components.OffPlanBusinessBay },
  // { path: "/destinations/dubai/off-plan/marina", component: Components.OffPlanDubaiMarina },
  // { path: "/destinations/dubai/off-plan/jvc", component: Components.OffPlanJVC },
  // { path: "/destinations/dubai/off-plan/palm-jumeirah", component: Components.OffPlanPalmJumeirah },
  // { path: "/destinations/dubai/off-plan/creek-harbour", component: Components.OffPlanCreekHarbour },
  // { path: "/destinations/dubai/off-plan/al-furjan", component: Components.OffPlanAlFurjan },
  // { path: "/destinations/dubai/off-plan/villas", component: Components.OffPlanVillas },
  // { path: "/destinations/dubai/off-plan/developers/emaar", component: Components.OffPlanEmaar },
  // { path: "/destinations/dubai/off-plan/developers/damac", component: Components.OffPlanDamac },
  // { path: "/destinations/dubai/off-plan/developers/nakheel", component: Components.OffPlanNakheel },
  // { path: "/destinations/dubai/off-plan/developers/meraas", component: Components.OffPlanMeraas },
  // { path: "/destinations/dubai/off-plan/developers/sobha", component: Components.OffPlanSobha },
  // { path: "/destinations/dubai/off-plan/crypto-payments", component: Components.OffPlanCryptoPayments },
  // { path: "/destinations/dubai/off-plan/usdt", component: Components.OffPlanUSDT },
  // { path: "/destinations/dubai/off-plan/golden-visa", component: Components.OffPlanGoldenVisa },
  // { path: "/destinations/dubai/off-plan/post-handover", component: Components.OffPlanPostHandover },
  // { path: "/destinations/dubai/off-plan/escrow", component: Components.OffPlanEscrow },
  // { path: "/destinations/dubai/off-plan/vs-ready", component: Components.OffPlanVsReady },

  // Dubai Comparison Pages (not yet implemented)
  // { path: "/destinations/dubai/compare/off-plan-vs-ready", component: Components.CompareOffPlanVsReady },
  // { path: "/destinations/dubai/compare/jvc-vs-dubai-south", component: Components.CompareJVCvsDubaiSouth },
  // { path: "/destinations/dubai/compare/emaar-vs-damac", component: Components.CompareEmaarVsDamac },
  // { path: "/destinations/dubai/compare/downtown-vs-marina", component: Components.CompareDowntownVsMarina },
  // { path: "/destinations/dubai/compare/payment-plans", component: Components.Compare6040vs8020 },
  // { path: "/destinations/dubai/compare/sobha-vs-meraas", component: Components.CompareSobhaVsMeraas },
  // { path: "/destinations/dubai/compare/crypto-vs-bank", component: Components.CompareCryptoVsBankTransfer },
  // { path: "/destinations/dubai/compare/business-bay-vs-jlt", component: Components.CompareBusinessBayVsJLT },
  // { path: "/destinations/dubai/compare/new-vs-resale", component: Components.CompareNewVsResale },
  // { path: "/destinations/dubai/compare/nakheel-vs-azizi", component: Components.CompareNakheelVsAzizi },
  // { path: "/destinations/dubai/compare/villa-vs-apartment", component: Components.CompareVillaVsApartment },
  // { path: "/destinations/dubai/compare/studio-vs-1bed", component: Components.CompareStudioVs1Bed },

  // Dubai Tools (not yet implemented)
  // { path: "/destinations/dubai/tools/roi-calculator", component: Components.ToolsROICalculator },
  // { path: "/destinations/dubai/tools/payment-calculator", component: Components.ToolsPaymentCalculator },
  // { path: "/destinations/dubai/tools/affordability-calculator", component: Components.ToolsAffordabilityCalculator },
  // { path: "/destinations/dubai/tools/currency-converter", component: Components.ToolsCurrencyConverter },
  // { path: "/destinations/dubai/tools/fees-calculator", component: Components.ToolsStampDutyCalculator },
  // { path: "/destinations/dubai/tools/rental-yield-calculator", component: Components.ToolsRentalYieldCalculator },
  // { path: "/destinations/dubai/tools/mortgage-calculator", component: Components.ToolsMortgageCalculator },

  // Dubai Case Studies (not yet implemented)
  // { path: "/destinations/dubai/case-studies/jvc-investor", component: Components.CaseStudyInvestorJVC },
  // { path: "/destinations/dubai/case-studies/crypto-buyer", component: Components.CaseStudyCryptoBuyer },
  // { path: "/destinations/dubai/case-studies/golden-visa", component: Components.CaseStudyGoldenVisa },
  // { path: "/destinations/dubai/case-studies/expat-family", component: Components.CaseStudyExpatFamily },
  // { path: "/destinations/dubai/case-studies/investor-flip", component: Components.CaseStudyInvestorFlip },
  // { path: "/destinations/dubai/case-studies/portfolio", component: Components.CaseStudyPortfolioDiversification },
  // { path: "/destinations/dubai/case-studies/off-plan-launch", component: Components.CaseStudyOffPlanLaunch },
  // { path: "/destinations/dubai/case-studies/retirement", component: Components.CaseStudyRetirementPlanning },

  // Dubai Pillar Pages (not yet implemented)
  // { path: "/destinations/dubai/roi-rental-yields", component: Components.PillarROIRentalYields },
  // { path: "/destinations/dubai/legal-security-guide", component: Components.PillarLegalSecurity },

  // Glossary
  { path: "/glossary", component: Components.GlossaryHub },

  // Dubai Landing Pages (not yet implemented)
  // { path: "/destinations/dubai/free-things-to-do", component: Components.LandingFreeDubai },
  // { path: "/destinations/dubai/laws-for-tourists", component: Components.LandingDubaiLaws },
  // { path: "/destinations/dubai/sheikh-mohammed", component: Components.LandingSheikhMohammed },
  // { path: "/destinations/dubai/24-hours-open", component: Components.LandingDubai247 },

  // Shopping & News
  { path: "/shopping", component: Components.PublicShopping },
  { path: "/news", component: Components.PublicNews },

  // Documentation
  { path: "/docs", component: Components.PublicDocs },
  { path: "/docs/:path*", component: Components.PublicDocs },

  // Legal Pages
  { path: "/privacy", component: Components.PrivacyPolicy },
  { path: "/privacy-policy", component: Components.PrivacyPolicy },
  { path: "/terms", component: Components.TermsConditions },
  { path: "/terms-conditions", component: Components.TermsConditions },
  { path: "/cookie-policy", component: Components.CookiePolicy },
  { path: "/cookies", component: Components.CookiePolicy },
  { path: "/security", component: Components.SecurityPolicy },
  { path: "/affiliate-disclosure", component: Components.AffiliateDisclosure },

  // About & Contact
  { path: "/about", component: Components.PublicAbout },
  { path: "/contact", component: Components.PublicContact },

  // Survey Pages
  { path: "/survey/:slug", component: Components.PublicSurvey },

  // Partner/Referral Pages
  { path: "/partners/join", component: Components.PartnersJoin },
  { path: "/partners/dashboard", component: Components.PartnersDashboard },

  // Dubai District Pages (not yet implemented)
  // { path: "/destinations/dubai/districts", component: Components.DistrictsGateway },
  // { path: "/destinations/dubai/districts/downtown", component: Components.DistrictDowntownDubai },
  // { path: "/destinations/dubai/districts/marina", component: Components.DistrictDubaiMarina },
  // { path: "/destinations/dubai/districts/jbr", component: Components.DistrictJBR },
  // { path: "/destinations/dubai/districts/palm-jumeirah", component: Components.DistrictPalmJumeirah },
  // { path: "/destinations/dubai/districts/jumeirah", component: Components.DistrictJumeirah },
  // { path: "/destinations/dubai/districts/business-bay", component: Components.DistrictBusinessBay },
  // { path: "/destinations/dubai/districts/old-dubai", component: Components.DistrictOldDubai },
  // { path: "/destinations/dubai/districts/creek-harbour", component: Components.DistrictDubaiCreekHarbour },
  // { path: "/destinations/dubai/districts/dubai-south", component: Components.DistrictDubaiSouth },
  // { path: "/destinations/dubai/districts/al-barsha", component: Components.DistrictAlBarsha },
  // { path: "/destinations/dubai/districts/difc", component: Components.DistrictDIFC },
  // { path: "/destinations/dubai/districts/hills-estate", component: Components.DistrictDubaiHills },
  // { path: "/destinations/dubai/districts/jvc", component: Components.DistrictJVC },
  // { path: "/destinations/dubai/districts/bluewaters", component: Components.DistrictBluewaters },
  // { path: "/destinations/dubai/districts/international-city", component: Components.DistrictInternationalCity },
  // { path: "/destinations/dubai/districts/al-karama", component: Components.DistrictAlKarama },
];

// Admin routes (not exported as we keep them in App.tsx for now)
// These are managed directly in the AdminRouter component
export const adminRoutes: RouteDefinition[] = [
  // Note: Admin routes are defined in App.tsx AdminRouter component
  // This export is here for future refactoring if needed
];
