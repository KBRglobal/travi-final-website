import { lazy } from "react";

export interface DubaiRouteDefinition {
  path: string;
  component: React.ComponentType<any>;
}

const DubaiModule = () => import("@/pages/dubai");

export const DistrictsGateway = lazy(() => DubaiModule().then(m => ({ default: m.DistrictsGateway })));
export const DistrictDowntownDubai = lazy(() => DubaiModule().then(m => ({ default: m.DistrictDowntownDubai })));
export const DistrictDubaiMarina = lazy(() => DubaiModule().then(m => ({ default: m.DistrictDubaiMarina })));
export const DistrictJBR = lazy(() => DubaiModule().then(m => ({ default: m.DistrictJBR })));
export const DistrictPalmJumeirah = lazy(() => DubaiModule().then(m => ({ default: m.DistrictPalmJumeirah })));
export const DistrictJumeirah = lazy(() => DubaiModule().then(m => ({ default: m.DistrictJumeirah })));
export const DistrictBusinessBay = lazy(() => DubaiModule().then(m => ({ default: m.DistrictBusinessBay })));
export const DistrictOldDubai = lazy(() => DubaiModule().then(m => ({ default: m.DistrictOldDubai })));
export const DistrictDubaiCreekHarbour = lazy(() => DubaiModule().then(m => ({ default: m.DistrictDubaiCreekHarbour })));
export const DistrictDubaiSouth = lazy(() => DubaiModule().then(m => ({ default: m.DistrictDubaiSouth })));
export const DistrictAlBarsha = lazy(() => DubaiModule().then(m => ({ default: m.DistrictAlBarsha })));
export const DistrictDIFC = lazy(() => DubaiModule().then(m => ({ default: m.DistrictDIFC })));
export const DistrictDubaiHills = lazy(() => DubaiModule().then(m => ({ default: m.DistrictDubaiHills })));
export const DistrictJVC = lazy(() => DubaiModule().then(m => ({ default: m.DistrictJVC })));
export const DistrictBluewaters = lazy(() => DubaiModule().then(m => ({ default: m.DistrictBluewaters })));
export const DistrictInternationalCity = lazy(() => DubaiModule().then(m => ({ default: m.DistrictInternationalCity })));
export const DistrictAlKarama = lazy(() => DubaiModule().then(m => ({ default: m.DistrictAlKarama })));

export const OffPlanInvestmentGuide = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanInvestmentGuide })));
export const OffPlanHowToBuy = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanHowToBuy })));
export const OffPlanPaymentPlans = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanPaymentPlans })));
export const OffPlanBest2026 = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanBest2026 })));
export const OffPlanBusinessBay = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanBusinessBay })));
export const OffPlanDubaiMarina = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanDubaiMarina })));
export const OffPlanJVC = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanJVC })));
export const OffPlanPalmJumeirah = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanPalmJumeirah })));
export const OffPlanCreekHarbour = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanCreekHarbour })));
export const OffPlanAlFurjan = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanAlFurjan })));
export const OffPlanVillas = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanVillas })));
export const OffPlanEmaar = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanEmaar })));
export const OffPlanDamac = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanDamac })));
export const OffPlanNakheel = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanNakheel })));
export const OffPlanMeraas = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanMeraas })));
export const OffPlanSobha = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanSobha })));
export const OffPlanCryptoPayments = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanCryptoPayments })));
export const OffPlanUSDT = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanUSDT })));
export const OffPlanGoldenVisa = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanGoldenVisa })));
export const OffPlanPostHandover = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanPostHandover })));
export const OffPlanEscrow = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanEscrow })));
export const OffPlanVsReady = lazy(() => DubaiModule().then(m => ({ default: m.OffPlanVsReady })));

export const CompareOffPlanVsReady = lazy(() => DubaiModule().then(m => ({ default: m.CompareOffPlanVsReady })));
export const CompareJVCvsDubaiSouth = lazy(() => DubaiModule().then(m => ({ default: m.CompareJVCvsDubaiSouth })));
export const CompareEmaarVsDamac = lazy(() => DubaiModule().then(m => ({ default: m.CompareEmaarVsDamac })));
export const CompareDowntownVsMarina = lazy(() => DubaiModule().then(m => ({ default: m.CompareDowntownVsMarina })));
export const Compare6040vs8020 = lazy(() => DubaiModule().then(m => ({ default: m.Compare6040vs8020 })));
export const CompareSobhaVsMeraas = lazy(() => DubaiModule().then(m => ({ default: m.CompareSobhaVsMeraas })));
export const CompareCryptoVsBankTransfer = lazy(() => DubaiModule().then(m => ({ default: m.CompareCryptoVsBankTransfer })));
export const CompareBusinessBayVsJLT = lazy(() => DubaiModule().then(m => ({ default: m.CompareBusinessBayVsJLT })));
export const CompareNewVsResale = lazy(() => DubaiModule().then(m => ({ default: m.CompareNewVsResale })));
export const CompareNakheelVsAzizi = lazy(() => DubaiModule().then(m => ({ default: m.CompareNakheelVsAzizi })));
export const CompareVillaVsApartment = lazy(() => DubaiModule().then(m => ({ default: m.CompareVillaVsApartment })));
export const CompareStudioVs1Bed = lazy(() => DubaiModule().then(m => ({ default: m.CompareStudioVs1Bed })));

export const ToolsROICalculator = lazy(() => DubaiModule().then(m => ({ default: m.ToolsROICalculator })));
export const ToolsPaymentCalculator = lazy(() => DubaiModule().then(m => ({ default: m.ToolsPaymentCalculator })));
export const ToolsAffordabilityCalculator = lazy(() => DubaiModule().then(m => ({ default: m.ToolsAffordabilityCalculator })));
export const ToolsCurrencyConverter = lazy(() => DubaiModule().then(m => ({ default: m.ToolsCurrencyConverter })));
export const ToolsFeesCalculator = lazy(() => DubaiModule().then(m => ({ default: m.ToolsFeesCalculator })));
export const ToolsRentalYieldCalculator = lazy(() => DubaiModule().then(m => ({ default: m.ToolsRentalYieldCalculator })));
export const ToolsMortgageCalculator = lazy(() => DubaiModule().then(m => ({ default: m.ToolsMortgageCalculator })));

export const CaseStudyInvestorJVC = lazy(() => DubaiModule().then(m => ({ default: m.CaseStudyInvestorJVC })));
export const CaseStudyCryptoBuyer = lazy(() => DubaiModule().then(m => ({ default: m.CaseStudyCryptoBuyer })));
export const CaseStudyGoldenVisa = lazy(() => DubaiModule().then(m => ({ default: m.CaseStudyGoldenVisa })));
export const CaseStudyExpatFamily = lazy(() => DubaiModule().then(m => ({ default: m.CaseStudyExpatFamily })));
export const CaseStudyInvestorFlip = lazy(() => DubaiModule().then(m => ({ default: m.CaseStudyInvestorFlip })));
export const CaseStudyPortfolioDiversification = lazy(() => DubaiModule().then(m => ({ default: m.CaseStudyPortfolioDiversification })));
export const CaseStudyOffPlanLaunch = lazy(() => DubaiModule().then(m => ({ default: m.CaseStudyOffPlanLaunch })));
export const CaseStudyRetirementPlanning = lazy(() => DubaiModule().then(m => ({ default: m.CaseStudyRetirementPlanning })));

export const PillarROIRentalYields = lazy(() => DubaiModule().then(m => ({ default: m.PillarROIRentalYields })));
export const PillarLegalSecurity = lazy(() => DubaiModule().then(m => ({ default: m.PillarLegalSecurity })));

export const LandingFreeDubai = lazy(() => DubaiModule().then(m => ({ default: m.LandingFreeDubai })));
export const LandingDubaiLaws = lazy(() => DubaiModule().then(m => ({ default: m.LandingDubaiLaws })));
export const LandingSheikhMohammed = lazy(() => DubaiModule().then(m => ({ default: m.LandingSheikhMohammed })));
export const LandingDubai247 = lazy(() => DubaiModule().then(m => ({ default: m.LandingDubai247 })));

export const dubaiRoutes: DubaiRouteDefinition[] = [
  { path: "/destinations/dubai/districts", component: DistrictsGateway },
  { path: "/destinations/dubai/districts/downtown", component: DistrictDowntownDubai },
  { path: "/destinations/dubai/districts/marina", component: DistrictDubaiMarina },
  { path: "/destinations/dubai/districts/jbr", component: DistrictJBR },
  { path: "/destinations/dubai/districts/palm-jumeirah", component: DistrictPalmJumeirah },
  { path: "/destinations/dubai/districts/jumeirah", component: DistrictJumeirah },
  { path: "/destinations/dubai/districts/business-bay", component: DistrictBusinessBay },
  { path: "/destinations/dubai/districts/old-dubai", component: DistrictOldDubai },
  { path: "/destinations/dubai/districts/creek-harbour", component: DistrictDubaiCreekHarbour },
  { path: "/destinations/dubai/districts/dubai-south", component: DistrictDubaiSouth },
  { path: "/destinations/dubai/districts/al-barsha", component: DistrictAlBarsha },
  { path: "/destinations/dubai/districts/difc", component: DistrictDIFC },
  { path: "/destinations/dubai/districts/hills-estate", component: DistrictDubaiHills },
  { path: "/destinations/dubai/districts/jvc", component: DistrictJVC },
  { path: "/destinations/dubai/districts/bluewaters", component: DistrictBluewaters },
  { path: "/destinations/dubai/districts/international-city", component: DistrictInternationalCity },
  { path: "/destinations/dubai/districts/al-karama", component: DistrictAlKarama },

  { path: "/destinations/dubai/off-plan/investment-guide", component: OffPlanInvestmentGuide },
  { path: "/destinations/dubai/off-plan/how-to-buy", component: OffPlanHowToBuy },
  { path: "/destinations/dubai/off-plan/payment-plans", component: OffPlanPaymentPlans },
  { path: "/destinations/dubai/off-plan/best-projects-2026", component: OffPlanBest2026 },
  { path: "/destinations/dubai/off-plan/business-bay", component: OffPlanBusinessBay },
  { path: "/destinations/dubai/off-plan/marina", component: OffPlanDubaiMarina },
  { path: "/destinations/dubai/off-plan/jvc", component: OffPlanJVC },
  { path: "/destinations/dubai/off-plan/palm-jumeirah", component: OffPlanPalmJumeirah },
  { path: "/destinations/dubai/off-plan/creek-harbour", component: OffPlanCreekHarbour },
  { path: "/destinations/dubai/off-plan/al-furjan", component: OffPlanAlFurjan },
  { path: "/destinations/dubai/off-plan/villas", component: OffPlanVillas },
  { path: "/destinations/dubai/off-plan/developers/emaar", component: OffPlanEmaar },
  { path: "/destinations/dubai/off-plan/developers/damac", component: OffPlanDamac },
  { path: "/destinations/dubai/off-plan/developers/nakheel", component: OffPlanNakheel },
  { path: "/destinations/dubai/off-plan/developers/meraas", component: OffPlanMeraas },
  { path: "/destinations/dubai/off-plan/developers/sobha", component: OffPlanSobha },
  { path: "/destinations/dubai/off-plan/crypto-payments", component: OffPlanCryptoPayments },
  { path: "/destinations/dubai/off-plan/usdt", component: OffPlanUSDT },
  { path: "/destinations/dubai/off-plan/golden-visa", component: OffPlanGoldenVisa },
  { path: "/destinations/dubai/off-plan/post-handover", component: OffPlanPostHandover },
  { path: "/destinations/dubai/off-plan/escrow", component: OffPlanEscrow },
  { path: "/destinations/dubai/off-plan/vs-ready", component: OffPlanVsReady },

  { path: "/destinations/dubai/compare/off-plan-vs-ready", component: CompareOffPlanVsReady },
  { path: "/destinations/dubai/compare/jvc-vs-dubai-south", component: CompareJVCvsDubaiSouth },
  { path: "/destinations/dubai/compare/emaar-vs-damac", component: CompareEmaarVsDamac },
  { path: "/destinations/dubai/compare/downtown-vs-marina", component: CompareDowntownVsMarina },
  { path: "/destinations/dubai/compare/payment-plans", component: Compare6040vs8020 },
  { path: "/destinations/dubai/compare/sobha-vs-meraas", component: CompareSobhaVsMeraas },
  { path: "/destinations/dubai/compare/crypto-vs-bank", component: CompareCryptoVsBankTransfer },
  { path: "/destinations/dubai/compare/business-bay-vs-jlt", component: CompareBusinessBayVsJLT },
  { path: "/destinations/dubai/compare/new-vs-resale", component: CompareNewVsResale },
  { path: "/destinations/dubai/compare/nakheel-vs-azizi", component: CompareNakheelVsAzizi },
  { path: "/destinations/dubai/compare/villa-vs-apartment", component: CompareVillaVsApartment },
  { path: "/destinations/dubai/compare/studio-vs-1bed", component: CompareStudioVs1Bed },

  { path: "/destinations/dubai/tools/roi-calculator", component: ToolsROICalculator },
  { path: "/destinations/dubai/tools/payment-calculator", component: ToolsPaymentCalculator },
  { path: "/destinations/dubai/tools/affordability-calculator", component: ToolsAffordabilityCalculator },
  { path: "/destinations/dubai/tools/currency-converter", component: ToolsCurrencyConverter },
  { path: "/destinations/dubai/tools/fees-calculator", component: ToolsFeesCalculator },
  { path: "/destinations/dubai/tools/rental-yield-calculator", component: ToolsRentalYieldCalculator },
  { path: "/destinations/dubai/tools/mortgage-calculator", component: ToolsMortgageCalculator },

  { path: "/destinations/dubai/case-studies/jvc-investor", component: CaseStudyInvestorJVC },
  { path: "/destinations/dubai/case-studies/crypto-buyer", component: CaseStudyCryptoBuyer },
  { path: "/destinations/dubai/case-studies/golden-visa", component: CaseStudyGoldenVisa },
  { path: "/destinations/dubai/case-studies/expat-family", component: CaseStudyExpatFamily },
  { path: "/destinations/dubai/case-studies/investor-flip", component: CaseStudyInvestorFlip },
  { path: "/destinations/dubai/case-studies/portfolio", component: CaseStudyPortfolioDiversification },
  { path: "/destinations/dubai/case-studies/off-plan-launch", component: CaseStudyOffPlanLaunch },
  { path: "/destinations/dubai/case-studies/retirement", component: CaseStudyRetirementPlanning },

  { path: "/destinations/dubai/roi-rental-yields", component: PillarROIRentalYields },
  { path: "/destinations/dubai/legal-security-guide", component: PillarLegalSecurity },

  { path: "/destinations/dubai/free-things-to-do", component: LandingFreeDubai },
  { path: "/destinations/dubai/laws-for-tourists", component: LandingDubaiLaws },
  { path: "/destinations/dubai/sheikh-mohammed", component: LandingSheikhMohammed },
  { path: "/destinations/dubai/24-hours-open", component: LandingDubai247 },
];
