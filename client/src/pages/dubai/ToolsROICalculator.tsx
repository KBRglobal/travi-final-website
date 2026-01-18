import { useState } from "react";
import { DubaiToolTemplate } from "./templates/DubaiToolTemplate";
import { getDubaiPageBySlug } from "@/data/dubai-pages";
import { Calculator, TrendingUp, Percent, DollarSign, Target, PiggyBank } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const pageData = getDubaiPageBySlug("roi-calculator");

export default function ToolsROICalculator() {
  const [purchasePrice, setPurchasePrice] = useState<string>("1000000");
  const [annualRent, setAnnualRent] = useState<string>("80000");
  const [serviceCharges, setServiceCharges] = useState<string>("15000");
  const [maintenanceCost, setMaintenanceCost] = useState<string>("5000");
  const [vacancyRate, setVacancyRate] = useState<string>("5");

  if (!pageData) return null;

  const price = parseFloat(purchasePrice) || 0;
  const rent = parseFloat(annualRent) || 0;
  const service = parseFloat(serviceCharges) || 0;
  const maintenance = parseFloat(maintenanceCost) || 0;
  const vacancy = parseFloat(vacancyRate) || 0;

  const grossYield = price > 0 ? ((rent / price) * 100) : 0;
  const vacancyLoss = rent * (vacancy / 100);
  const totalExpenses = service + maintenance + vacancyLoss;
  const netRent = rent - totalExpenses;
  const netYield = price > 0 ? ((netRent / price) * 100) : 0;
  const annualProfit = netRent;
  const monthlyProfit = netRent / 12;

  const results = price > 0 ? [
    {
      label: "Gross Rental Yield",
      value: `${grossYield.toFixed(2)}%`,
      subtext: "Before expenses",
    },
    {
      label: "Net Rental Yield",
      value: `${netYield.toFixed(2)}%`,
      highlight: true,
      subtext: "After all expenses",
    },
    {
      label: "Annual Net Profit",
      value: `AED ${annualProfit.toLocaleString()}`,
      subtext: "Yearly income after costs",
    },
    {
      label: "Monthly Net Income",
      value: `AED ${monthlyProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      subtext: "Average monthly return",
    },
  ] : [];

  const inputSection = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="purchasePrice">Purchase Price (AED)</Label>
        <Input
          id="purchasePrice"
          type="number"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(e.target.value)}
          placeholder="1,000,000"
          data-testid="input-purchase-price"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="annualRent">Annual Rental Income (AED)</Label>
        <Input
          id="annualRent"
          type="number"
          value={annualRent}
          onChange={(e) => setAnnualRent(e.target.value)}
          placeholder="80,000"
          data-testid="input-annual-rent"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="serviceCharges">Annual Service Charges (AED)</Label>
        <Input
          id="serviceCharges"
          type="number"
          value={serviceCharges}
          onChange={(e) => setServiceCharges(e.target.value)}
          placeholder="15,000"
          data-testid="input-service-charges"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="maintenanceCost">Annual Maintenance (AED)</Label>
        <Input
          id="maintenanceCost"
          type="number"
          value={maintenanceCost}
          onChange={(e) => setMaintenanceCost(e.target.value)}
          placeholder="5,000"
          data-testid="input-maintenance"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vacancyRate">Vacancy Rate (%)</Label>
        <Input
          id="vacancyRate"
          type="number"
          value={vacancyRate}
          onChange={(e) => setVacancyRate(e.target.value)}
          placeholder="5"
          data-testid="input-vacancy-rate"
        />
      </div>
    </div>
  );

  const helpfulTips = [
    {
      icon: Target,
      title: "Aim for 7%+ Net Yield",
      description: "Properties in JVC, Business Bay, and Dubai South typically offer the best rental yields in Dubai.",
    },
    {
      icon: Percent,
      title: "Factor All Expenses",
      description: "Include service charges, maintenance, vacancy allowance, and management fees for accurate calculations.",
    },
    {
      icon: TrendingUp,
      title: "Consider Capital Appreciation",
      description: "Dubai properties have appreciated 30-50% in prime areas over the past 5 years, adding to total ROI.",
    },
    {
      icon: DollarSign,
      title: "Tax-Free Returns",
      description: "Dubai has zero income tax on rental income and zero capital gains tax, maximizing your net returns.",
    },
    {
      icon: PiggyBank,
      title: "Service Charge Trends",
      description: "Check the building's service charge history. Typical range is AED 12-25 per sqft annually.",
    },
    {
      icon: Calculator,
      title: "Gross vs Net Yield",
      description: "Gross yield ignores costs. Net yield (after expenses) gives you the true picture of your investment return.",
    },
  ];

  const faqs = [
    {
      question: "What is a good ROI on Dubai property?",
      answer: "A good ROI in Dubai is 7-10% gross yield (5-7% net). High-yield areas like JVC and Dubai South can achieve 8-10%, while premium areas like Palm Jumeirah typically yield 4-6% but offer better capital appreciation.",
    },
    {
      question: "How is rental yield calculated in Dubai?",
      answer: "Gross Yield = (Annual Rent / Purchase Price) x 100. Net Yield = ((Annual Rent - All Expenses) / Purchase Price) x 100. Expenses include service charges, maintenance, vacancy allowance, and management fees.",
    },
    {
      question: "Is rental income taxed in Dubai?",
      answer: "No, there is zero income tax on rental income in Dubai. There is also no capital gains tax when you sell. The main costs are the one-time 4% DLD registration fee and ongoing service charges.",
    },
    {
      question: "What expenses should I include in ROI calculation?",
      answer: "Include: service charges (AED 12-25/sqft), maintenance reserve (1-2% of property value), vacancy allowance (5-8%), property management (5-8% of rent if applicable), and landlord insurance.",
    },
    {
      question: "Which Dubai areas have the highest rental yields?",
      answer: "JVC (8-10%), International City (9-11%), Dubai South (7-9%), and Discovery Gardens (8-9%) offer the highest yields. Business Bay and Dubai Marina offer balanced 6-8% yields with good appreciation.",
    },
  ];

  return (
    <DubaiToolTemplate
      title={pageData.title}
      metaDescription={pageData.description}
      canonicalPath="/destinations/dubai/tools/roi-calculator"
      keywords={pageData.keywords}
      breadcrumbs={pageData.breadcrumbs}
      hero={{
        title: pageData.hero.title,
        subtitle: pageData.hero.subtitle,
        backgroundImage: pageData.hero.image,
        badges: pageData.hero.badges?.map(text => ({ text })),
      }}
      calculatorTitle="Property ROI Calculator"
      calculatorSubtitle="Calculate your expected returns from Dubai property investment"
      calculatorIcon={Calculator}
      calculatorBadges={["Net Yield", "Gross Yield", "Annual Profit"]}
      inputSection={inputSection}
      results={results}
      disclaimer="This calculator provides estimates based on the inputs provided. Actual returns may vary based on market conditions, property management, and other factors. Consult a financial advisor for personalized advice."
      helpfulTips={helpfulTips}
      helpfulTipsTitle="ROI Tips for Dubai Property"
      helpfulTipsSubtitle="Maximize your investment returns with these expert insights"
      faqs={faqs}
      faqTitle="ROI Calculator FAQ"
      cta={{
        title: "Ready to Invest?",
        description: "Explore high-yield off-plan properties in Dubai with attractive payment plans.",
        primaryButton: {
          label: "View Off-Plan Projects",
          href: "/destinations/dubai/off-plan",
        },
        secondaryButton: {
          label: "Compare Areas by Yield",
          href: "/destinations/dubai/compare/areas",
        },
      }}
    />
  );
}
