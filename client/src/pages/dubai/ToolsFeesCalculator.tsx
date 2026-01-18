import { useState } from "react";
import { DubaiToolTemplate } from "./templates/DubaiToolTemplate";
import { getDubaiPageBySlug } from "@/data/dubai-pages";
import { Receipt, Building, Percent, FileText, CreditCard, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const pageData = getDubaiPageBySlug("fees-calculator");

export default function ToolsFeesCalculator() {
  const [propertyPrice, setPropertyPrice] = useState<string>("1500000");
  const [includeAgentFee, setIncludeAgentFee] = useState<boolean>(true);
  const [includeMortgage, setIncludeMortgage] = useState<boolean>(false);
  const [mortgageAmount, setMortgageAmount] = useState<string>("1200000");

  if (!pageData) return null;

  const price = parseFloat(propertyPrice) || 0;
  const mortgage = parseFloat(mortgageAmount) || 0;

  const dldFee = price * 0.04;
  const dldAdminFee = 580;
  const agentFee = includeAgentFee ? price * 0.02 : 0;
  const agentVat = agentFee * 0.05;
  const nocFee = 1000;
  const trusteeFee = includeMortgage ? 4200 : 2100;
  const mortgageRegistration = includeMortgage ? mortgage * 0.0025 : 0;
  const valuationFee = includeMortgage ? 3000 : 0;
  const bankProcessing = includeMortgage ? 5000 : 0;

  const totalFees = dldFee + dldAdminFee + agentFee + agentVat + nocFee + trusteeFee + mortgageRegistration + valuationFee + bankProcessing;
  const totalCost = price + totalFees;
  const percentageOfPrice = (totalFees / price) * 100;

  const results = price > 0 ? [
    {
      label: "Total Transaction Fees",
      value: `AED ${Math.round(totalFees).toLocaleString()}`,
      highlight: true,
      subtext: `${percentageOfPrice.toFixed(2)}% of property price`,
    },
    {
      label: "DLD Transfer Fee",
      value: `AED ${Math.round(dldFee).toLocaleString()}`,
      subtext: "4% of property price",
    },
    {
      label: "Total Cost (Property + Fees)",
      value: `AED ${Math.round(totalCost).toLocaleString()}`,
      subtext: "Property price plus all fees",
    },
    ...(includeAgentFee ? [{
      label: "Agent Commission + VAT",
      value: `AED ${Math.round(agentFee + agentVat).toLocaleString()}`,
      subtext: "2% + 5% VAT",
    }] : []),
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
      
      <div className="flex items-center justify-between py-2">
        <Label htmlFor="agentFee">Include Agent Fee (2%)</Label>
        <Switch
          id="agentFee"
          checked={includeAgentFee}
          onCheckedChange={setIncludeAgentFee}
          data-testid="switch-agent-fee"
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="mortgageFees">Include Mortgage Fees</Label>
        <Switch
          id="mortgageFees"
          checked={includeMortgage}
          onCheckedChange={setIncludeMortgage}
          data-testid="switch-mortgage"
        />
      </div>

      {includeMortgage && (
        <div className="space-y-2">
          <Label htmlFor="mortgageAmount">Mortgage Amount (AED)</Label>
          <Input
            id="mortgageAmount"
            type="number"
            value={mortgageAmount}
            onChange={(e) => setMortgageAmount(e.target.value)}
            placeholder="1,200,000"
            data-testid="input-mortgage-amount"
          />
        </div>
      )}
    </div>
  );

  const additionalContent = price > 0 ? (
    <div className="space-y-4">
      <h4 className="font-semibold">Fee Breakdown</h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">DLD Fee (4%):</span>
          <span>AED {Math.round(dldFee).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">DLD Admin:</span>
          <span>AED {dldAdminFee.toLocaleString()}</span>
        </div>
        {includeAgentFee && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agent (2%):</span>
              <span>AED {Math.round(agentFee).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agent VAT (5%):</span>
              <span>AED {Math.round(agentVat).toLocaleString()}</span>
            </div>
          </>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">NOC Fee:</span>
          <span>AED {nocFee.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Trustee Fee:</span>
          <span>AED {trusteeFee.toLocaleString()}</span>
        </div>
        {includeMortgage && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mortgage Reg (0.25%):</span>
              <span>AED {Math.round(mortgageRegistration).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valuation:</span>
              <span>AED {valuationFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bank Processing:</span>
              <span>AED {bankProcessing.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  const helpfulTips = [
    {
      icon: Percent,
      title: "4% DLD is the Big One",
      description: "The Dubai Land Department transfer fee (4%) is the largest cost. It's paid once at registration.",
    },
    {
      icon: Building,
      title: "Off-Plan May Split DLD",
      description: "Some developers pay 2% of DLD fee on off-plan projects as an incentive. Check your offer.",
    },
    {
      icon: CreditCard,
      title: "Agent Fees Are Negotiable",
      description: "The 2% agent commission is standard but can sometimes be negotiated, especially on high-value properties.",
    },
    {
      icon: FileText,
      title: "Budget 7-8% for Cash Buyers",
      description: "Plan for approximately 7-8% of property price in total transaction costs for cash purchases.",
    },
    {
      icon: Shield,
      title: "Mortgage Adds ~1% More",
      description: "If financing, add roughly 1% more for mortgage registration, valuation, and processing fees.",
    },
    {
      icon: Receipt,
      title: "No Annual Property Tax",
      description: "Unlike many countries, Dubai has no annual property tax. Costs are primarily one-time transaction fees.",
    },
  ];

  const faqs = [
    {
      question: "What is the DLD fee in Dubai?",
      answer: "The Dubai Land Department (DLD) transfer fee is 4% of the property purchase price. This is the primary transaction cost and is paid at the time of registration. Some off-plan developers offer to pay 2% as an incentive.",
    },
    {
      question: "How much are agent fees in Dubai?",
      answer: "Standard real estate agent commission in Dubai is 2% of the property price, plus 5% VAT on the commission. This is typically paid by the buyer, though it can sometimes be split or negotiated.",
    },
    {
      question: "What are mortgage registration fees?",
      answer: "Mortgage registration fee is 0.25% of the loan amount, paid to DLD. Additional costs include bank processing fee (AED 3,000-10,000), valuation fee (AED 2,500-3,500), and life insurance.",
    },
    {
      question: "Are there any annual property taxes in Dubai?",
      answer: "No, Dubai does not have annual property tax. The main recurring costs are service charges (building maintenance) and municipality fees (usually included in DEWA bills at 5% of rental value).",
    },
    {
      question: "What is a NOC fee?",
      answer: "NOC (No Objection Certificate) is issued by the developer confirming no outstanding dues. It costs around AED 500-5,000 depending on the developer. Required for secondary market sales.",
    },
  ];

  return (
    <DubaiToolTemplate
      title={pageData.title}
      metaDescription={pageData.description}
      canonicalPath="/destinations/dubai/tools/fees-calculator"
      keywords={pageData.keywords}
      breadcrumbs={pageData.breadcrumbs}
      hero={{
        title: pageData.hero.title,
        subtitle: pageData.hero.subtitle,
        backgroundImage: pageData.hero.image,
        badges: pageData.hero.badges?.map(text => ({ text })),
      }}
      calculatorTitle="Property Fees Calculator"
      calculatorSubtitle="Calculate all transaction costs when buying property in Dubai"
      calculatorIcon={Receipt}
      calculatorBadges={["DLD 4%", "Agent 2%", "All Fees"]}
      inputSection={inputSection}
      results={results}
      additionalCalculatorContent={additionalContent}
      disclaimer="Fee estimates are based on standard Dubai property transactions. Actual fees may vary based on specific circumstances, developer policies, and bank charges. Always confirm final costs before completing a transaction."
      helpfulTips={helpfulTips}
      helpfulTipsTitle="Understanding Dubai Property Fees"
      helpfulTipsSubtitle="Know what to expect when buying property in Dubai"
      faqs={faqs}
      faqTitle="Property Fees FAQ"
      cta={{
        title: "Plan Your Purchase",
        description: "Now that you know the costs, calculate your affordability.",
        primaryButton: {
          label: "Check Affordability",
          href: "/destinations/dubai/tools/affordability-calculator",
        },
        secondaryButton: {
          label: "View Properties",
          href: "/destinations/dubai/off-plan",
        },
      }}
    />
  );
}
