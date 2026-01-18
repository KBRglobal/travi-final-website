import { useState } from "react";
import { DubaiToolTemplate } from "./templates/DubaiToolTemplate";
import { getDubaiPageBySlug } from "@/data/dubai-pages";
import { TrendingUp, Home, Percent, Calculator, Coins, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const pageData = getDubaiPageBySlug("rental-yield-calculator");

export default function ToolsRentalYieldCalculator() {
  const [propertyPrice, setPropertyPrice] = useState<string>("1000000");
  const [annualRent, setAnnualRent] = useState<string>("70000");
  const [serviceCharges, setServiceCharges] = useState<string>("12000");
  const [maintenancePercent, setMaintenancePercent] = useState<string>("2");
  const [vacancyPercent, setVacancyPercent] = useState<string>("5");
  const [managementPercent, setManagementPercent] = useState<string>("5");

  if (!pageData) return null;

  const price = parseFloat(propertyPrice) || 0;
  const rent = parseFloat(annualRent) || 0;
  const service = parseFloat(serviceCharges) || 0;
  const maintenance = (parseFloat(maintenancePercent) || 0) / 100 * price;
  const vacancy = (parseFloat(vacancyPercent) || 0) / 100 * rent;
  const management = (parseFloat(managementPercent) || 0) / 100 * rent;

  const grossYield = price > 0 ? (rent / price) * 100 : 0;
  const totalExpenses = service + maintenance + vacancy + management;
  const netRent = rent - totalExpenses;
  const netYield = price > 0 ? (netRent / price) * 100 : 0;
  const yieldDifference = grossYield - netYield;

  const results = price > 0 ? [
    {
      label: "Gross Rental Yield",
      value: `${grossYield.toFixed(2)}%`,
      subtext: "Before any expenses",
    },
    {
      label: "Net Rental Yield",
      value: `${netYield.toFixed(2)}%`,
      highlight: true,
      subtext: "After all expenses",
    },
    {
      label: "Annual Net Income",
      value: `AED ${Math.round(netRent).toLocaleString()}`,
      subtext: "Yearly profit after costs",
    },
    {
      label: "Total Annual Expenses",
      value: `AED ${Math.round(totalExpenses).toLocaleString()}`,
      subtext: `${yieldDifference.toFixed(2)}% yield reduction`,
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
          placeholder="1,000,000"
          data-testid="input-property-price"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="annualRent">Annual Rent (AED)</Label>
        <Input
          id="annualRent"
          type="number"
          value={annualRent}
          onChange={(e) => setAnnualRent(e.target.value)}
          placeholder="70,000"
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
          placeholder="12,000"
          data-testid="input-service-charges"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="maintenancePercent">Maintenance (% of property)</Label>
        <Input
          id="maintenancePercent"
          type="number"
          step="0.5"
          value={maintenancePercent}
          onChange={(e) => setMaintenancePercent(e.target.value)}
          placeholder="2"
          data-testid="input-maintenance"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vacancyPercent">Vacancy (% of rent)</Label>
        <Input
          id="vacancyPercent"
          type="number"
          step="0.5"
          value={vacancyPercent}
          onChange={(e) => setVacancyPercent(e.target.value)}
          placeholder="5"
          data-testid="input-vacancy"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="managementPercent">Management Fee (% of rent)</Label>
        <Input
          id="managementPercent"
          type="number"
          step="0.5"
          value={managementPercent}
          onChange={(e) => setManagementPercent(e.target.value)}
          placeholder="5"
          data-testid="input-management"
        />
      </div>
    </div>
  );

  const additionalContent = price > 0 ? (
    <div className="space-y-4">
      <h4 className="font-semibold">Expense Breakdown</h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Service Charges:</span>
          <span>AED {Math.round(service).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Maintenance Reserve:</span>
          <span>AED {Math.round(maintenance).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Vacancy Allowance:</span>
          <span>AED {Math.round(vacancy).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Management Fee:</span>
          <span>AED {Math.round(management).toLocaleString()}</span>
        </div>
      </div>
    </div>
  ) : null;

  const helpfulTips = [
    {
      icon: Percent,
      title: "Net Yield is Key",
      description: "Always calculate net yield. Gross yield ignores costs and can be misleading by 2-3 percentage points.",
    },
    {
      icon: Home,
      title: "Service Charges Vary",
      description: "Service charges range from AED 10-35 per sqft depending on building quality and amenities.",
    },
    {
      icon: Coins,
      title: "Include Vacancy",
      description: "Budget 5-8% vacancy allowance. Even popular areas experience 2-4 weeks between tenants.",
    },
    {
      icon: TrendingUp,
      title: "Higher Yield vs Appreciation",
      description: "High-yield areas (8%+) often have lower appreciation. Premium areas yield less but grow more.",
    },
    {
      icon: Calculator,
      title: "Furnishing Boosts Rent",
      description: "Furnished apartments can command 20-40% higher rents but require upfront investment.",
    },
    {
      icon: BarChart3,
      title: "Compare to Benchmarks",
      description: "Dubai average: 7% gross, 5-6% net. Above 8% gross is excellent, below 5% is below average.",
    },
  ];

  const faqs = [
    {
      question: "What is the difference between gross and net yield?",
      answer: "Gross yield = Annual Rent / Property Price. Net yield deducts all expenses (service charges, maintenance, vacancy, management) from rent before dividing by price. Net yield is typically 2-3% lower than gross.",
    },
    {
      question: "What is a good rental yield in Dubai?",
      answer: "A good rental yield in Dubai is 7-8% gross (5-6% net). High-yield areas like JVC and International City can achieve 8-10% gross, while premium areas like Palm Jumeirah typically yield 4-6% gross.",
    },
    {
      question: "What expenses reduce rental yield?",
      answer: "Main expenses: service charges (AED 10-35/sqft), maintenance (1-2% of value), vacancy (5-8% of rent), management fees (5-8% if using agent), and landlord insurance. These typically reduce yield by 2-3%.",
    },
    {
      question: "How do service charges affect yield?",
      answer: "Service charges can significantly impact net yield. A property with AED 35/sqft charges vs AED 15/sqft could have 1-2% lower net yield. Always check service charge history before buying.",
    },
    {
      question: "Should I manage the property myself or use an agent?",
      answer: "Self-management saves 5-8% of rent but requires time and local presence. Property management companies handle tenant finding, rent collection, and maintenance. Worth it for overseas investors.",
    },
  ];

  return (
    <DubaiToolTemplate
      title={pageData.title}
      metaDescription={pageData.description}
      canonicalPath="/destinations/dubai/tools/rental-yield-calculator"
      keywords={pageData.keywords}
      breadcrumbs={pageData.breadcrumbs}
      hero={{
        title: pageData.hero.title,
        subtitle: pageData.hero.subtitle,
        backgroundImage: pageData.hero.image,
        badges: pageData.hero.badges?.map(text => ({ text })),
      }}
      calculatorTitle="Rental Yield Calculator"
      calculatorSubtitle="Calculate your true net rental yield after all expenses"
      calculatorIcon={TrendingUp}
      calculatorBadges={["Gross Yield", "Net Yield", "All Expenses"]}
      inputSection={inputSection}
      results={results}
      additionalCalculatorContent={additionalContent}
      disclaimer="Yields are estimates based on inputs provided. Actual rental income may vary based on market conditions, property condition, and tenant demand. Service charges and expenses can change annually."
      helpfulTips={helpfulTips}
      helpfulTipsTitle="Rental Yield Tips"
      helpfulTipsSubtitle="Maximize your rental returns in Dubai"
      faqs={faqs}
      faqTitle="Rental Yield FAQ"
      cta={{
        title: "Find High-Yield Properties",
        description: "Explore properties in areas with the best rental yields.",
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
