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
  { path: "/attractions", component: Components.PublicAttractions },
  { path: "/attractions/map", component: Components.AttractionsMap },
  { path: "/attractions/:slug", component: Components.PublicContentViewer },
  { path: "/hotels", component: Components.PublicHotels },
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

  // Off-Plan Real Estate
  { path: "/dubai-real-estate", component: Components.PublicOffPlan },
  { path: "/dubai-off-plan-properties", component: Components.PublicOffPlan },
  { path: "/dubai-off-plan-investment-guide", component: Components.OffPlanInvestmentGuide },
  { path: "/how-to-buy-dubai-off-plan", component: Components.OffPlanHowToBuy },
  { path: "/dubai-off-plan-payment-plans", component: Components.OffPlanPaymentPlans },
  { path: "/best-off-plan-projects-dubai-2026", component: Components.OffPlanBest2026 },
  { path: "/dubai-off-plan-business-bay", component: Components.OffPlanBusinessBay },
  { path: "/dubai-off-plan-marina", component: Components.OffPlanDubaiMarina },
  { path: "/dubai-off-plan-jvc", component: Components.OffPlanJVC },
  { path: "/dubai-off-plan-palm-jumeirah", component: Components.OffPlanPalmJumeirah },
  { path: "/dubai-off-plan-creek-harbour", component: Components.OffPlanCreekHarbour },
  { path: "/dubai-off-plan-al-furjan", component: Components.OffPlanAlFurjan },
  { path: "/dubai-off-plan-villas", component: Components.OffPlanVillas },
  { path: "/off-plan-emaar", component: Components.OffPlanEmaar },
  { path: "/off-plan-damac", component: Components.OffPlanDamac },
  { path: "/off-plan-nakheel", component: Components.OffPlanNakheel },
  { path: "/off-plan-meraas", component: Components.OffPlanMeraas },
  { path: "/off-plan-sobha", component: Components.OffPlanSobha },
  { path: "/off-plan-crypto-payments", component: Components.OffPlanCryptoPayments },
  { path: "/off-plan-usdt", component: Components.OffPlanUSDT },
  { path: "/off-plan-golden-visa", component: Components.OffPlanGoldenVisa },
  { path: "/off-plan-post-handover", component: Components.OffPlanPostHandover },
  { path: "/off-plan-escrow", component: Components.OffPlanEscrow },
  { path: "/off-plan-vs-ready", component: Components.OffPlanVsReady },

  // Comparison Pages
  { path: "/compare-off-plan-vs-ready", component: Components.CompareOffPlanVsReady },
  { path: "/compare-jvc-vs-dubai-south", component: Components.CompareJVCvsDubaiSouth },
  { path: "/compare-emaar-vs-damac", component: Components.CompareEmaarVsDamac },
  { path: "/compare-downtown-vs-marina", component: Components.CompareDowntownVsMarina },
  { path: "/compare-60-40-vs-80-20", component: Components.Compare6040vs8020 },
  { path: "/compare-sobha-vs-meraas", component: Components.CompareSobhaVsMeraas },
  { path: "/compare-crypto-vs-bank-transfer", component: Components.CompareCryptoVsBankTransfer },
  { path: "/compare-business-bay-vs-jlt", component: Components.CompareBusinessBayVsJLT },
  { path: "/compare-new-vs-resale", component: Components.CompareNewVsResale },
  { path: "/compare-nakheel-vs-azizi", component: Components.CompareNakheelVsAzizi },
  { path: "/compare-villa-vs-apartment", component: Components.CompareVillaVsApartment },
  { path: "/compare-studio-vs-1bed", component: Components.CompareStudioVs1Bed },

  // Tools
  { path: "/tools-roi-calculator", component: Components.ToolsROICalculator },
  { path: "/tools-payment-calculator", component: Components.ToolsPaymentCalculator },
  { path: "/tools-affordability-calculator", component: Components.ToolsAffordabilityCalculator },
  { path: "/tools-currency-converter", component: Components.ToolsCurrencyConverter },
  { path: "/tools-fees-calculator", component: Components.ToolsStampDutyCalculator },
  { path: "/tools-rental-yield-calculator", component: Components.ToolsRentalYieldCalculator },
  { path: "/tools-mortgage-calculator", component: Components.ToolsMortgageCalculator },

  // Case Studies
  { path: "/case-study-jvc-investor", component: Components.CaseStudyInvestorJVC },
  { path: "/case-study-crypto-buyer", component: Components.CaseStudyCryptoBuyer },
  { path: "/case-study-golden-visa", component: Components.CaseStudyGoldenVisa },
  { path: "/case-study-expat-family", component: Components.CaseStudyExpatFamily },
  { path: "/case-study-investor-flip", component: Components.CaseStudyInvestorFlip },
  { path: "/case-study-portfolio-diversification", component: Components.CaseStudyPortfolioDiversification },
  { path: "/case-study-off-plan-launch", component: Components.CaseStudyOffPlanLaunch },
  { path: "/case-study-retirement-planning", component: Components.CaseStudyRetirementPlanning },

  // Pillar Pages
  { path: "/dubai-roi-rental-yields", component: Components.PillarROIRentalYields },
  { path: "/dubai-legal-security-guide", component: Components.PillarLegalSecurity },

  // Glossary
  { path: "/glossary", component: Components.GlossaryHub },

  // Landing Pages
  { path: "/dubai/free-things-to-do", component: Components.LandingFreeDubai },
  { path: "/dubai/laws-for-tourists", component: Components.LandingDubaiLaws },
  { path: "/dubai/sheikh-mohammed-bin-rashid", component: Components.LandingSheikhMohammed },
  { path: "/dubai/24-hours-open", component: Components.LandingDubai247 },

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

  // District Pages
  { path: "/districts", component: Components.DistrictsGateway },
  { path: "/districts/downtown-dubai", component: Components.DistrictDowntownDubai },
  { path: "/districts/dubai-marina", component: Components.DistrictDubaiMarina },
  { path: "/districts/jbr-jumeirah-beach-residence", component: Components.DistrictJBR },
  { path: "/districts/palm-jumeirah", component: Components.DistrictPalmJumeirah },
  { path: "/districts/jumeirah", component: Components.DistrictJumeirah },
  { path: "/districts/business-bay", component: Components.DistrictBusinessBay },
  { path: "/districts/old-dubai", component: Components.DistrictOldDubai },
  { path: "/districts/dubai-creek-harbour", component: Components.DistrictDubaiCreekHarbour },
  { path: "/districts/dubai-south", component: Components.DistrictDubaiSouth },
  { path: "/districts/al-barsha", component: Components.DistrictAlBarsha },
  { path: "/districts/difc", component: Components.DistrictDIFC },
  { path: "/districts/dubai-hills-estate", component: Components.DistrictDubaiHills },
  { path: "/districts/jvc", component: Components.DistrictJVC },
  { path: "/districts/bluewaters-island", component: Components.DistrictBluewaters },
  { path: "/districts/international-city", component: Components.DistrictInternationalCity },
  { path: "/districts/al-karama", component: Components.DistrictAlKarama },
];

// Admin routes (not exported as we keep them in App.tsx for now)
// These are managed directly in the AdminRouter component
export const adminRoutes: RouteDefinition[] = [
  // Note: Admin routes are defined in App.tsx AdminRouter component
  // This export is here for future refactoring if needed
];
