import { useState } from "react";
import { DubaiToolTemplate } from "./templates/DubaiToolTemplate";
import { getDubaiPageBySlug } from "@/data/dubai-pages";
import { CreditCard, Calendar, Percent, Building, Clock, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const pageData = getDubaiPageBySlug("payment-calculator");

type PaymentPlan = "60/40" | "70/30" | "80/20" | "50/50" | "40/60";

interface PaymentBreakdown {
  downPayment: number;
  constructionTotal: number;
  handover: number;
  constructionPercent: number;
  handoverPercent: number;
}

const paymentPlans: Record<PaymentPlan, PaymentBreakdown> = {
  "60/40": { downPayment: 10, constructionTotal: 50, handover: 40, constructionPercent: 50, handoverPercent: 40 },
  "70/30": { downPayment: 10, constructionTotal: 60, handover: 30, constructionPercent: 60, handoverPercent: 30 },
  "80/20": { downPayment: 20, constructionTotal: 60, handover: 20, constructionPercent: 60, handoverPercent: 20 },
  "50/50": { downPayment: 10, constructionTotal: 40, handover: 50, constructionPercent: 40, handoverPercent: 50 },
  "40/60": { downPayment: 10, constructionTotal: 30, handover: 60, constructionPercent: 30, handoverPercent: 60 },
};

export default function ToolsPaymentCalculator() {
  const [propertyPrice, setPropertyPrice] = useState<string>("1500000");
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>("60/40");
  const [constructionMonths, setConstructionMonths] = useState<string>("36");

  if (!pageData) return null;

  const price = parseFloat(propertyPrice) || 0;
  const months = parseInt(constructionMonths) || 36;
  const plan = paymentPlans[selectedPlan];

  const downPaymentAmount = (price * plan.downPayment) / 100;
  const constructionAmount = (price * plan.constructionTotal) / 100;
  const handoverAmount = (price * plan.handoverPercent) / 100;
  const monthlyConstruction = constructionAmount / months;

  const results = price > 0 ? [
    {
      label: "Down Payment (Booking)",
      value: `AED ${downPaymentAmount.toLocaleString()}`,
      subtext: `${plan.downPayment}% of property price`,
    },
    {
      label: "During Construction",
      value: `AED ${constructionAmount.toLocaleString()}`,
      highlight: true,
      subtext: `${plan.constructionTotal}% over ${months} months`,
    },
    {
      label: "Monthly Construction Payment",
      value: `AED ${monthlyConstruction.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      subtext: "Average monthly installment",
    },
    {
      label: "On Handover",
      value: `AED ${handoverAmount.toLocaleString()}`,
      subtext: `${plan.handoverPercent}% at completion`,
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
        <Label htmlFor="paymentPlan">Payment Plan</Label>
        <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as PaymentPlan)}>
          <SelectTrigger id="paymentPlan" data-testid="select-payment-plan">
            <SelectValue placeholder="Select payment plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="60/40">60/40 - Standard Plan</SelectItem>
            <SelectItem value="70/30">70/30 - More During Construction</SelectItem>
            <SelectItem value="80/20">80/20 - Minimal Handover</SelectItem>
            <SelectItem value="50/50">50/50 - Balanced Plan</SelectItem>
            <SelectItem value="40/60">40/60 - Post-Handover Heavy</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="constructionMonths">Construction Period (Months)</Label>
        <Input
          id="constructionMonths"
          type="number"
          value={constructionMonths}
          onChange={(e) => setConstructionMonths(e.target.value)}
          placeholder="36"
          data-testid="input-construction-months"
        />
      </div>
    </div>
  );

  const helpfulTips = [
    {
      icon: Percent,
      title: "60/40 is Most Common",
      description: "The 60/40 plan is Dubai's standard: 60% during construction and 40% on handover. Great for cash flow management.",
    },
    {
      icon: Calendar,
      title: "Post-Handover Options",
      description: "Some developers offer 40/60 or even 30/70 plans with payments extending 2-5 years after handover.",
    },
    {
      icon: CreditCard,
      title: "Interest-Free Financing",
      description: "Developer payment plans are typically 0% interest. You're essentially getting free financing during construction.",
    },
    {
      icon: Building,
      title: "Milestone-Based Payments",
      description: "Payments are usually tied to construction milestones: foundation, structure, finishing, handover.",
    },
    {
      icon: Clock,
      title: "Plan Your Cash Flow",
      description: "Factor in your monthly payment ability and other financial commitments when choosing a payment plan.",
    },
    {
      icon: CheckCircle,
      title: "Escrow Protection",
      description: "All payments go into RERA-regulated escrow accounts, protecting your investment during construction.",
    },
  ];

  const faqs = [
    {
      question: "What is a 60/40 payment plan?",
      answer: "A 60/40 plan means you pay 60% of the property price during construction (typically 10% booking + 50% in installments) and 40% upon handover when you receive the keys.",
    },
    {
      question: "Are off-plan payment plans interest-free?",
      answer: "Yes, most developer payment plans during construction and post-handover are interest-free. You're essentially getting 0% financing directly from the developer.",
    },
    {
      question: "What is post-handover payment?",
      answer: "Post-handover plans allow you to pay a portion (typically 20-60%) after receiving the property keys. This can extend 2-5 years after handover with interest-free installments.",
    },
    {
      question: "Can I pay off my property early?",
      answer: "Yes, most developers allow early payment without penalty. Some may offer a discount (1-3%) for full upfront payment. Check your SPA (Sales Purchase Agreement) for specific terms.",
    },
    {
      question: "What happens if I miss a payment?",
      answer: "Missing payments can result in late fees and potential contract termination. If you face difficulties, contact the developer immediately to discuss alternative arrangements.",
    },
  ];

  return (
    <DubaiToolTemplate
      title={pageData.title}
      metaDescription={pageData.description}
      canonicalPath="/destinations/dubai/tools/payment-calculator"
      keywords={pageData.keywords}
      breadcrumbs={pageData.breadcrumbs}
      hero={{
        title: pageData.hero.title,
        subtitle: pageData.hero.subtitle,
        backgroundImage: pageData.hero.image,
        badges: pageData.hero.badges?.map(text => ({ text })),
      }}
      calculatorTitle="Payment Plan Calculator"
      calculatorSubtitle="Plan your off-plan property payments with different payment structures"
      calculatorIcon={CreditCard}
      calculatorBadges={["60/40", "70/30", "80/20", "Post-Handover"]}
      inputSection={inputSection}
      results={results}
      disclaimer="Payment structures vary by developer and project. This calculator provides general estimates. Always confirm exact payment terms in your Sales Purchase Agreement (SPA)."
      helpfulTips={helpfulTips}
      helpfulTipsTitle="Payment Plan Tips"
      helpfulTipsSubtitle="Understand your off-plan payment options"
      faqs={faqs}
      faqTitle="Payment Plan FAQ"
      cta={{
        title: "Explore Off-Plan Projects",
        description: "Find projects with flexible payment plans that suit your budget.",
        primaryButton: {
          label: "View Off-Plan Properties",
          href: "/destinations/dubai/off-plan",
        },
        secondaryButton: {
          label: "Learn About Payment Plans",
          href: "/destinations/dubai/off-plan/payment-plans",
        },
      }}
    />
  );
}
