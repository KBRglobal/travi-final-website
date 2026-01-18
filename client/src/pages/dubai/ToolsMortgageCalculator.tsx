import { useState } from "react";
import { DubaiToolTemplate } from "./templates/DubaiToolTemplate";
import { getDubaiPageBySlug } from "@/data/dubai-pages";
import { Building2, Percent, Calendar, Calculator, Shield, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const pageData = getDubaiPageBySlug("mortgage-calculator");

export default function ToolsMortgageCalculator() {
  const [propertyPrice, setPropertyPrice] = useState<string>("1500000");
  const [downPaymentPercent, setDownPaymentPercent] = useState<string>("20");
  const [interestRate, setInterestRate] = useState<string>("4.5");
  const [loanTerm, setLoanTerm] = useState<string>("25");

  if (!pageData) return null;

  const price = parseFloat(propertyPrice) || 0;
  const downPayment = (parseFloat(downPaymentPercent) || 0) / 100;
  const rate = (parseFloat(interestRate) || 0) / 100 / 12;
  const term = (parseInt(loanTerm) || 25) * 12;

  const loanAmount = price * (1 - downPayment);
  const downPaymentAmount = price * downPayment;

  const monthlyPayment = rate > 0 
    ? (loanAmount * rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1)
    : loanAmount / term;

  const totalPayments = monthlyPayment * term;
  const totalInterest = totalPayments - loanAmount;
  const totalCost = price + totalInterest;

  const results = price > 0 ? [
    {
      label: "Monthly Payment",
      value: `AED ${Math.round(monthlyPayment).toLocaleString()}`,
      highlight: true,
      subtext: "Principal + Interest",
    },
    {
      label: "Loan Amount",
      value: `AED ${Math.round(loanAmount).toLocaleString()}`,
      subtext: `${100 - (downPayment * 100)}% of property price`,
    },
    {
      label: "Total Interest Paid",
      value: `AED ${Math.round(totalInterest).toLocaleString()}`,
      subtext: `Over ${loanTerm} years`,
    },
    {
      label: "Total Cost",
      value: `AED ${Math.round(totalCost).toLocaleString()}`,
      subtext: "Property + Interest",
    },
  ] : [];

  const inputSection = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="propertyPrice">Property Price (AED)</Label>
        <Input
          id="propertyPrice"
          type="number"
          value={propertyPrice}
          onChange={(e) => setPropertyPrice(e.target.value)}
          placeholder="1,500,000"
          data-testid="input-property-price"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="downPayment">Down Payment (%)</Label>
        <Select value={downPaymentPercent} onValueChange={setDownPaymentPercent}>
          <SelectTrigger id="downPayment" data-testid="select-down-payment">
            <SelectValue placeholder="Select down payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15% (UAE Nationals, up to AED 5M)</SelectItem>
            <SelectItem value="20">20% (Expats, up to AED 5M)</SelectItem>
            <SelectItem value="25">25% (UAE Nationals, above AED 5M)</SelectItem>
            <SelectItem value="30">30% (Expats, above AED 5M)</SelectItem>
            <SelectItem value="35">35%</SelectItem>
            <SelectItem value="40">40%</SelectItem>
            <SelectItem value="50">50%</SelectItem>
          </SelectContent>
        </Select>
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
      <div className="space-y-2">
        <Label htmlFor="loanTerm">Loan Term (Years)</Label>
        <Select value={loanTerm} onValueChange={setLoanTerm}>
          <SelectTrigger id="loanTerm" data-testid="select-loan-term">
            <SelectValue placeholder="Select term" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 Years</SelectItem>
            <SelectItem value="10">10 Years</SelectItem>
            <SelectItem value="15">15 Years</SelectItem>
            <SelectItem value="20">20 Years</SelectItem>
            <SelectItem value="25">25 Years</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const additionalContent = price > 0 ? (
    <div className="space-y-4">
      <h4 className="font-semibold">Loan Summary</h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Property Price:</span>
          <span>AED {price.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Down Payment:</span>
          <span>AED {Math.round(downPaymentAmount).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Loan Amount:</span>
          <span>AED {Math.round(loanAmount).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Monthly EMI:</span>
          <span>AED {Math.round(monthlyPayment).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Payments:</span>
          <span>AED {Math.round(totalPayments).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Interest:</span>
          <span>AED {Math.round(totalInterest).toLocaleString()}</span>
        </div>
      </div>
    </div>
  ) : null;

  const helpfulTips = [
    {
      icon: Percent,
      title: "Current Rates: 4-5%",
      description: "UAE mortgage rates typically range from 4-5% for fixed periods of 1-5 years, then become variable.",
    },
    {
      icon: Building2,
      title: "20% Minimum for Expats",
      description: "Expats need minimum 20% down payment for properties up to AED 5M, 30% for higher values.",
    },
    {
      icon: Calendar,
      title: "Max 25 Years Term",
      description: "Maximum mortgage term is 25 years, and the loan must be repaid by age 65 (expats) or 70 (UAE nationals).",
    },
    {
      icon: Calculator,
      title: "50% DTI Limit",
      description: "Total monthly debt payments cannot exceed 50% of your monthly income including the new mortgage.",
    },
    {
      icon: Shield,
      title: "Life Insurance Required",
      description: "Banks require life insurance covering the loan amount. Factor this into monthly costs.",
    },
    {
      icon: TrendingDown,
      title: "Consider Variable Rates",
      description: "Variable rates are lower initially but can increase. Fixed rates offer payment stability.",
    },
  ];

  const faqs = [
    {
      question: "What is the current mortgage rate in Dubai?",
      answer: "Mortgage rates in UAE typically range from 4-5% for fixed-rate periods (1-5 years). Variable rates are usually EIBOR + 1.5-2.5%. Rates vary by bank, loan amount, and borrower profile.",
    },
    {
      question: "How much down payment do I need?",
      answer: "Expats need minimum 20% down payment for properties up to AED 5M, and 30% for properties above AED 5M. UAE nationals need 15% and 25% respectively.",
    },
    {
      question: "What is the maximum mortgage amount in UAE?",
      answer: "For first property: up to 80% of value (AED 5M or below) or 70% (above AED 5M) for expats. Also capped by income: total debt payments cannot exceed 50% of monthly income.",
    },
    {
      question: "Can I get a mortgage as a non-resident?",
      answer: "Yes, several UAE banks offer mortgages to non-residents. Requirements are stricter: typically 50% down payment, higher rates, and strong income documentation from your home country.",
    },
    {
      question: "Should I choose fixed or variable rate?",
      answer: "Fixed rates offer payment certainty for 1-5 years, ideal if you prefer stability. Variable rates are lower initially but can increase with EIBOR. Consider your risk tolerance and how long you'll hold the property.",
    },
  ];

  return (
    <DubaiToolTemplate
      title={pageData.title}
      metaDescription={pageData.description}
      canonicalPath="/destinations/dubai/tools/mortgage-calculator"
      keywords={pageData.keywords}
      breadcrumbs={pageData.breadcrumbs}
      hero={{
        title: pageData.hero.title,
        subtitle: pageData.hero.subtitle,
        backgroundImage: pageData.hero.image,
        badges: pageData.hero.badges?.map(text => ({ text })),
      }}
      calculatorTitle="Mortgage Calculator"
      calculatorSubtitle="Calculate your monthly mortgage payments in Dubai"
      calculatorIcon={Building2}
      calculatorBadges={["UAE Rates", "EMI Calculator", "Total Cost"]}
      inputSection={inputSection}
      results={results}
      additionalCalculatorContent={additionalContent}
      disclaimer="This calculator provides estimates based on the inputs provided. Actual mortgage terms depend on bank policies, credit history, and property type. Contact banks directly for pre-approval and exact rates."
      helpfulTips={helpfulTips}
      helpfulTipsTitle="Mortgage Tips for Dubai"
      helpfulTipsSubtitle="Navigate UAE home financing successfully"
      faqs={faqs}
      faqTitle="Mortgage FAQ"
      cta={{
        title: "Ready to Get Pre-Approved?",
        description: "Know your budget and start your property search with confidence.",
        primaryButton: {
          label: "Check Affordability",
          href: "/destinations/dubai/tools/affordability-calculator",
        },
        secondaryButton: {
          label: "Browse Properties",
          href: "/destinations/dubai/off-plan",
        },
      }}
    />
  );
}
