import { useState } from "react";
import { DubaiToolTemplate } from "./templates/DubaiToolTemplate";
import { getDubaiPageBySlug } from "@/data/dubai-pages";
import { Wallet, Home, TrendingUp, Calculator, Percent, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const pageData = getDubaiPageBySlug("affordability-calculator");

export default function ToolsAffordabilityCalculator() {
  const [monthlyIncome, setMonthlyIncome] = useState<string>("25000");
  const [totalSavings, setTotalSavings] = useState<string>("300000");
  const [existingDebt, setExistingDebt] = useState<string>("2000");
  const [interestRate, setInterestRate] = useState<string>("4.5");

  if (!pageData) return null;

  const income = parseFloat(monthlyIncome) || 0;
  const savings = parseFloat(totalSavings) || 0;
  const debt = parseFloat(existingDebt) || 0;
  const rate = parseFloat(interestRate) || 4.5;

  const maxDti = 0.50;
  const availableForMortgage = (income * maxDti) - debt;
  const monthlyRate = rate / 100 / 12;
  const termMonths = 25 * 12;
  
  const maxLoan = availableForMortgage > 0 
    ? availableForMortgage * ((Math.pow(1 + monthlyRate, termMonths) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, termMonths)))
    : 0;

  const maxDownPaymentPercent = 20;
  const maxPropertyWithSavings = savings / (maxDownPaymentPercent / 100);
  const maxPropertyWithMortgage = maxLoan / 0.80;
  
  const maxAffordableProperty = Math.min(maxPropertyWithSavings, maxPropertyWithMortgage);
  const requiredDownPayment = maxAffordableProperty * 0.20;
  const estimatedMortgage = maxAffordableProperty * 0.80;
  const estimatedMonthlyPayment = estimatedMortgage > 0 
    ? (estimatedMortgage * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1)
    : 0;

  const results = income > 0 ? [
    {
      label: "Maximum Property Price",
      value: `AED ${Math.floor(maxAffordableProperty).toLocaleString()}`,
      highlight: true,
      subtext: "Based on your income and savings",
    },
    {
      label: "Required Down Payment",
      value: `AED ${Math.floor(requiredDownPayment).toLocaleString()}`,
      subtext: "20% of property price (min for expats)",
    },
    {
      label: "Maximum Mortgage",
      value: `AED ${Math.floor(estimatedMortgage).toLocaleString()}`,
      subtext: "80% LTV for expats",
    },
    {
      label: "Est. Monthly Payment",
      value: `AED ${Math.floor(estimatedMonthlyPayment).toLocaleString()}`,
      subtext: `At ${rate}% over 25 years`,
    },
  ] : [];

  const inputSection = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="monthlyIncome">Monthly Income (AED)</Label>
        <Input
          id="monthlyIncome"
          type="number"
          value={monthlyIncome}
          onChange={(e) => setMonthlyIncome(e.target.value)}
          placeholder="25,000"
          data-testid="input-monthly-income"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="totalSavings">Total Savings Available (AED)</Label>
        <Input
          id="totalSavings"
          type="number"
          value={totalSavings}
          onChange={(e) => setTotalSavings(e.target.value)}
          placeholder="300,000"
          data-testid="input-savings"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="existingDebt">Existing Monthly Debt (AED)</Label>
        <Input
          id="existingDebt"
          type="number"
          value={existingDebt}
          onChange={(e) => setExistingDebt(e.target.value)}
          placeholder="2,000"
          data-testid="input-existing-debt"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="interestRate">Interest Rate (%)</Label>
        <Input
          id="interestRate"
          type="number"
          step="0.1"
          value={interestRate}
          onChange={(e) => setInterestRate(e.target.value)}
          placeholder="4.5"
          data-testid="input-interest-rate"
        />
      </div>
    </div>
  );

  const helpfulTips = [
    {
      icon: Percent,
      title: "50% DTI Rule",
      description: "UAE banks cap total debt payments at 50% of your monthly income, including the new mortgage.",
    },
    {
      icon: Home,
      title: "20% Down Payment Minimum",
      description: "Expats need minimum 20% down payment for properties up to AED 5M. UAE nationals need 15%.",
    },
    {
      icon: Calculator,
      title: "Include All Costs",
      description: "Budget for 7-8% additional costs: 4% DLD, 2% agent, plus registration and mortgage fees.",
    },
    {
      icon: TrendingUp,
      title: "Factor In Service Charges",
      description: "Don't forget monthly service charges (AED 1,000-3,000+) when planning your budget.",
    },
    {
      icon: Shield,
      title: "Keep Emergency Fund",
      description: "Don't use all savings for down payment. Keep 3-6 months expenses as emergency reserve.",
    },
    {
      icon: Wallet,
      title: "Off-Plan Alternative",
      description: "If mortgage affordability is tight, consider off-plan with 10-20% down and payment plans.",
    },
  ];

  const faqs = [
    {
      question: "How much can I borrow for a mortgage in Dubai?",
      answer: "Banks typically lend up to 80% of property value for expats (up to AED 5M property) and 85% for UAE nationals. Maximum loan amounts are also capped based on your income, with total debt not exceeding 50% of monthly salary.",
    },
    {
      question: "What is the minimum down payment in Dubai?",
      answer: "Expats need minimum 20% down payment for properties up to AED 5M, and 30% for properties above AED 5M. UAE nationals need 15% and 25% respectively.",
    },
    {
      question: "What income do I need to buy property in Dubai?",
      answer: "There's no fixed minimum, but banks require your total monthly debt (including new mortgage) to not exceed 50% of income. A AED 25,000 monthly income could qualify for roughly AED 1.2-1.5M property with mortgage.",
    },
    {
      question: "Can I get a mortgage if I'm self-employed?",
      answer: "Yes, but requirements are stricter. You'll need audited financials, trade license, and typically 2+ years of business history. Banks may require higher down payment or offer lower loan amounts.",
    },
    {
      question: "Are there additional costs beyond the down payment?",
      answer: "Yes, budget for 7-8% additional costs: 4% DLD transfer fee, 2% agency commission, mortgage registration (0.25%), valuation fees, and processing fees. Total upfront cost is typically 27-28% of property price.",
    },
  ];

  return (
    <DubaiToolTemplate
      title={pageData.title}
      metaDescription={pageData.description}
      canonicalPath="/destinations/dubai/tools/affordability-calculator"
      keywords={pageData.keywords}
      breadcrumbs={pageData.breadcrumbs}
      hero={{
        title: pageData.hero.title,
        subtitle: pageData.hero.subtitle,
        backgroundImage: pageData.hero.image,
        badges: pageData.hero.badges?.map(text => ({ text })),
      }}
      calculatorTitle="Affordability Calculator"
      calculatorSubtitle="Find out what you can afford in Dubai real estate"
      calculatorIcon={Wallet}
      calculatorBadges={["Income-Based", "Savings Check", "DTI Analysis"]}
      inputSection={inputSection}
      results={results}
      disclaimer="This is an estimate based on typical UAE bank lending criteria. Actual mortgage approval depends on credit history, employment status, and bank policies. Consult with banks for pre-approval."
      helpfulTips={helpfulTips}
      helpfulTipsTitle="Affordability Tips"
      helpfulTipsSubtitle="Plan your Dubai property purchase wisely"
      faqs={faqs}
      faqTitle="Affordability FAQ"
      cta={{
        title: "Start Your Property Search",
        description: "Now that you know your budget, explore properties within your range.",
        primaryButton: {
          label: "Browse Properties",
          href: "/destinations/dubai/off-plan",
        },
        secondaryButton: {
          label: "Calculate Mortgage",
          href: "/destinations/dubai/tools/mortgage-calculator",
        },
      }}
    />
  );
}
