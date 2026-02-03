/**
 * Dubai Pages - Stub Exports
 *
 * This file exports all Dubai-related page components as stubs.
 * Each component can be replaced with full implementations as needed.
 */

import React from 'react';

// Placeholder component factory
const createStubPage = (name: string, category: string) => {
  const StubComponent: React.FC = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full mb-3">
            {category}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{name}</h1>
          <p className="text-gray-600">
            This page is under development. Content coming soon.
          </p>
        </div>
      </div>
    </div>
  );
  StubComponent.displayName = name;
  return StubComponent;
};

// ============================================================================
// DISTRICTS (17 components)
// ============================================================================

export const DistrictsGateway = createStubPage('Districts Gateway', 'Districts');
export const DistrictDowntownDubai = createStubPage('Downtown Dubai', 'Districts');
export const DistrictDubaiMarina = createStubPage('Dubai Marina', 'Districts');
export const DistrictJBR = createStubPage('Jumeirah Beach Residence', 'Districts');
export const DistrictPalmJumeirah = createStubPage('Palm Jumeirah', 'Districts');
export const DistrictJumeirah = createStubPage('Jumeirah', 'Districts');
export const DistrictBusinessBay = createStubPage('Business Bay', 'Districts');
export const DistrictOldDubai = createStubPage('Old Dubai', 'Districts');
export const DistrictDubaiCreekHarbour = createStubPage('Dubai Creek Harbour', 'Districts');
export const DistrictDubaiSouth = createStubPage('Dubai South', 'Districts');
export const DistrictAlBarsha = createStubPage('Al Barsha', 'Districts');
export const DistrictDIFC = createStubPage('DIFC', 'Districts');
export const DistrictDubaiHills = createStubPage('Dubai Hills Estate', 'Districts');
export const DistrictJVC = createStubPage('Jumeirah Village Circle', 'Districts');
export const DistrictBluewaters = createStubPage('Bluewaters Island', 'Districts');
export const DistrictInternationalCity = createStubPage('International City', 'Districts');
export const DistrictAlKarama = createStubPage('Al Karama', 'Districts');

// ============================================================================
// OFF-PLAN (22 components)
// ============================================================================

export const OffPlanInvestmentGuide = createStubPage('Off-Plan Investment Guide', 'Off-Plan');
export const OffPlanHowToBuy = createStubPage('How to Buy Off-Plan', 'Off-Plan');
export const OffPlanPaymentPlans = createStubPage('Payment Plans Guide', 'Off-Plan');
export const OffPlanBest2026 = createStubPage('Best Off-Plan Projects 2026', 'Off-Plan');
export const OffPlanBusinessBay = createStubPage('Off-Plan in Business Bay', 'Off-Plan');
export const OffPlanDubaiMarina = createStubPage('Off-Plan in Dubai Marina', 'Off-Plan');
export const OffPlanJVC = createStubPage('Off-Plan in JVC', 'Off-Plan');
export const OffPlanPalmJumeirah = createStubPage('Off-Plan on Palm Jumeirah', 'Off-Plan');
export const OffPlanCreekHarbour = createStubPage('Off-Plan in Creek Harbour', 'Off-Plan');
export const OffPlanAlFurjan = createStubPage('Off-Plan in Al Furjan', 'Off-Plan');
export const OffPlanVillas = createStubPage('Off-Plan Villas', 'Off-Plan');
export const OffPlanEmaar = createStubPage('Emaar Off-Plan Projects', 'Off-Plan');
export const OffPlanDamac = createStubPage('DAMAC Off-Plan Projects', 'Off-Plan');
export const OffPlanNakheel = createStubPage('Nakheel Off-Plan Projects', 'Off-Plan');
export const OffPlanMeraas = createStubPage('Meraas Off-Plan Projects', 'Off-Plan');
export const OffPlanSobha = createStubPage('Sobha Off-Plan Projects', 'Off-Plan');
export const OffPlanCryptoPayments = createStubPage('Buy Property with Crypto', 'Off-Plan');
export const OffPlanUSDT = createStubPage('Buy Property with USDT', 'Off-Plan');
export const OffPlanGoldenVisa = createStubPage('Golden Visa Properties', 'Off-Plan');
export const OffPlanPostHandover = createStubPage('Post-Handover Payment Plans', 'Off-Plan');
export const OffPlanEscrow = createStubPage('Escrow Account Guide', 'Off-Plan');
export const OffPlanVsReady = createStubPage('Off-Plan vs Ready Properties', 'Off-Plan');

// ============================================================================
// COMPARISONS (12 components)
// ============================================================================

export const CompareOffPlanVsReady = createStubPage('Off-Plan vs Ready Properties', 'Comparisons');
export const CompareJVCvsDubaiSouth = createStubPage('JVC vs Dubai South', 'Comparisons');
export const CompareEmaarVsDamac = createStubPage('Emaar vs DAMAC', 'Comparisons');
export const CompareDowntownVsMarina = createStubPage('Downtown vs Marina', 'Comparisons');
export const Compare6040vs8020 = createStubPage('60/40 vs 80/20 Payment Plans', 'Comparisons');
export const CompareSobhaVsMeraas = createStubPage('Sobha vs Meraas', 'Comparisons');
export const CompareCryptoVsBankTransfer = createStubPage('Crypto vs Bank Transfer', 'Comparisons');
export const CompareBusinessBayVsJLT = createStubPage('Business Bay vs JLT', 'Comparisons');
export const CompareNewVsResale = createStubPage('New vs Resale Properties', 'Comparisons');
export const CompareNakheelVsAzizi = createStubPage('Nakheel vs Azizi', 'Comparisons');
export const CompareVillaVsApartment = createStubPage('Villa vs Apartment', 'Comparisons');
export const CompareStudioVs1Bed = createStubPage('Studio vs 1-Bedroom', 'Comparisons');

// ============================================================================
// TOOLS (7 components)
// ============================================================================

export const ToolsROICalculator = createStubPage('ROI Calculator', 'Tools');
export const ToolsPaymentCalculator = createStubPage('Payment Plan Calculator', 'Tools');
export const ToolsAffordabilityCalculator = createStubPage('Affordability Calculator', 'Tools');
export const ToolsCurrencyConverter = createStubPage('Currency Converter', 'Tools');
export const ToolsFeesCalculator = createStubPage('Fees Calculator', 'Tools');
export const ToolsRentalYieldCalculator = createStubPage('Rental Yield Calculator', 'Tools');
export const ToolsMortgageCalculator = createStubPage('Mortgage Calculator', 'Tools');

// ============================================================================
// CASE STUDIES (8 components)
// ============================================================================

export const CaseStudyInvestorJVC = createStubPage('JVC Investment Case Study', 'Case Studies');
export const CaseStudyCryptoBuyer = createStubPage('Crypto Buyer Case Study', 'Case Studies');
export const CaseStudyGoldenVisa = createStubPage('Golden Visa Case Study', 'Case Studies');
export const CaseStudyExpatFamily = createStubPage('Expat Family Case Study', 'Case Studies');
export const CaseStudyInvestorFlip = createStubPage('Property Flip Case Study', 'Case Studies');
export const CaseStudyPortfolioDiversification = createStubPage('Portfolio Diversification Case Study', 'Case Studies');
export const CaseStudyOffPlanLaunch = createStubPage('Off-Plan Launch Case Study', 'Case Studies');
export const CaseStudyRetirementPlanning = createStubPage('Retirement Planning Case Study', 'Case Studies');

// ============================================================================
// PILLAR (2 components)
// ============================================================================

export const PillarROIRentalYields = createStubPage('ROI & Rental Yields Guide', 'Pillar Content');
export const PillarLegalSecurity = createStubPage('Legal & Security Guide', 'Pillar Content');

// ============================================================================
// LANDING (4 components)
// ============================================================================

export const LandingFreeDubai = createStubPage('Free in Dubai', 'Landing Pages');
export const LandingDubaiLaws = createStubPage('Dubai Laws', 'Landing Pages');
export const LandingSheikhMohammed = createStubPage('Sheikh Mohammed', 'Landing Pages');
export const LandingDubai247 = createStubPage('Dubai 24/7', 'Landing Pages');
