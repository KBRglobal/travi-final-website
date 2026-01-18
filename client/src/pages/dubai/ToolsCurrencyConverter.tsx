import { useState } from "react";
import { DubaiToolTemplate } from "./templates/DubaiToolTemplate";
import { getDubaiPageBySlug } from "@/data/dubai-pages";
import { RefreshCw, Globe, DollarSign, TrendingUp, Shield, ArrowRightLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const pageData = getDubaiPageBySlug("currency-converter");

interface CurrencyRate {
  code: string;
  name: string;
  rateToAED: number;
  symbol: string;
}

const currencies: CurrencyRate[] = [
  { code: "USD", name: "US Dollar", rateToAED: 3.67, symbol: "$" },
  { code: "EUR", name: "Euro", rateToAED: 4.02, symbol: "€" },
  { code: "GBP", name: "British Pound", rateToAED: 4.68, symbol: "£" },
  { code: "INR", name: "Indian Rupee", rateToAED: 0.044, symbol: "₹" },
  { code: "PKR", name: "Pakistani Rupee", rateToAED: 0.013, symbol: "Rs" },
  { code: "CNY", name: "Chinese Yuan", rateToAED: 0.51, symbol: "¥" },
  { code: "SAR", name: "Saudi Riyal", rateToAED: 0.98, symbol: "SR" },
  { code: "KWD", name: "Kuwaiti Dinar", rateToAED: 12.03, symbol: "KD" },
  { code: "QAR", name: "Qatari Riyal", rateToAED: 1.01, symbol: "QR" },
  { code: "AUD", name: "Australian Dollar", rateToAED: 2.42, symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", rateToAED: 2.71, symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", rateToAED: 4.25, symbol: "CHF" },
  { code: "SGD", name: "Singapore Dollar", rateToAED: 2.76, symbol: "S$" },
  { code: "JPY", name: "Japanese Yen", rateToAED: 0.025, symbol: "¥" },
  { code: "RUB", name: "Russian Ruble", rateToAED: 0.041, symbol: "₽" },
];

export default function ToolsCurrencyConverter() {
  const [amount, setAmount] = useState<string>("100000");
  const [fromCurrency, setFromCurrency] = useState<string>("USD");
  const [direction, setDirection] = useState<"toAED" | "fromAED">("toAED");

  if (!pageData) return null;

  const value = parseFloat(amount) || 0;
  const selectedCurrency = currencies.find(c => c.code === fromCurrency) || currencies[0];

  const convertedAmount = direction === "toAED" 
    ? value * selectedCurrency.rateToAED
    : value / selectedCurrency.rateToAED;

  const equivalentPropertyExamples = direction === "toAED" ? [
    { type: "Studio in JVC", price: 450000 },
    { type: "1BR in Business Bay", price: 900000 },
    { type: "2BR in Dubai Marina", price: 1800000 },
  ] : [];

  const results = value > 0 ? [
    {
      label: direction === "toAED" ? `${selectedCurrency.code} to AED` : `AED to ${selectedCurrency.code}`,
      value: direction === "toAED" 
        ? `AED ${convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
        : `${selectedCurrency.symbol}${convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      highlight: true,
      subtext: `1 ${selectedCurrency.code} = ${selectedCurrency.rateToAED.toFixed(4)} AED`,
    },
    {
      label: "Exchange Rate",
      value: `${selectedCurrency.rateToAED.toFixed(4)}`,
      subtext: `AED per 1 ${selectedCurrency.code}`,
    },
    {
      label: "Inverse Rate",
      value: `${(1 / selectedCurrency.rateToAED).toFixed(4)}`,
      subtext: `${selectedCurrency.code} per 1 AED`,
    },
  ] : [];

  const inputSection = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100,000"
          data-testid="input-amount"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="direction">Direction</Label>
        <Select value={direction} onValueChange={(v) => setDirection(v as "toAED" | "fromAED")}>
          <SelectTrigger id="direction" data-testid="select-direction">
            <SelectValue placeholder="Select direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toAED">Convert to AED</SelectItem>
            <SelectItem value="fromAED">Convert from AED</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="currency">Currency</Label>
        <Select value={fromCurrency} onValueChange={setFromCurrency}>
          <SelectTrigger id="currency" data-testid="select-currency">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {currencies.map(currency => (
              <SelectItem key={currency.code} value={currency.code}>
                {currency.symbol} {currency.code} - {currency.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const helpfulTips = [
    {
      icon: Shield,
      title: "USD Peg Stability",
      description: "AED is pegged to USD at 3.67, providing currency stability for dollar-based investors.",
    },
    {
      icon: DollarSign,
      title: "No Currency Risk",
      description: "For USD-based investors, there's effectively zero currency risk when investing in Dubai property.",
    },
    {
      icon: TrendingUp,
      title: "Strong Dirham",
      description: "The AED benefits from UAE's strong economy, oil reserves, and sound fiscal policy.",
    },
    {
      icon: Globe,
      title: "Multi-Currency Payments",
      description: "Many Dubai developers accept payments in USD, EUR, and other major currencies.",
    },
    {
      icon: ArrowRightLeft,
      title: "Easy Transfers",
      description: "UAE has no capital controls. You can freely transfer funds in and out of the country.",
    },
    {
      icon: RefreshCw,
      title: "Competitive Rates",
      description: "UAE exchange houses often offer better rates than banks for currency conversion.",
    },
  ];

  const faqs = [
    {
      question: "What is the AED to USD exchange rate?",
      answer: "The UAE Dirham (AED) is pegged to the US Dollar at a fixed rate of 3.67 AED = 1 USD. This peg has been in place since 1997 and provides currency stability for investors.",
    },
    {
      question: "Can I pay for Dubai property in my local currency?",
      answer: "While property transactions are typically in AED, many developers accept USD, EUR, and other major currencies. Your bank will convert at market rates. Some developers offer fixed exchange rates for the transaction.",
    },
    {
      question: "Is there currency risk when buying Dubai property?",
      answer: "For USD-based investors, there's minimal currency risk due to the AED-USD peg. For other currencies, fluctuations can affect your investment value. Consider hedging strategies for significant amounts.",
    },
    {
      question: "Where can I get the best exchange rates in Dubai?",
      answer: "UAE exchange houses (Al Ansari, Al Rostamani, etc.) often offer better rates than banks. Compare rates and avoid airport exchanges. For large sums, negotiate directly with exchange houses.",
    },
    {
      question: "Are there limits on transferring money to Dubai?",
      answer: "UAE has no capital controls. However, your home country may have reporting requirements for large transfers. Banks may require source of funds documentation for amounts over certain thresholds.",
    },
  ];

  return (
    <DubaiToolTemplate
      title={pageData.title}
      metaDescription={pageData.description}
      canonicalPath="/destinations/dubai/tools/currency-converter"
      keywords={pageData.keywords}
      breadcrumbs={pageData.breadcrumbs}
      hero={{
        title: pageData.hero.title,
        subtitle: pageData.hero.subtitle,
        backgroundImage: pageData.hero.image,
        badges: pageData.hero.badges?.map(text => ({ text })),
      }}
      calculatorTitle="Currency Converter"
      calculatorSubtitle="Convert Dubai property prices to your local currency"
      calculatorIcon={RefreshCw}
      calculatorBadges={["15+ Currencies", "Real Rates", "USD Pegged"]}
      inputSection={inputSection}
      results={results}
      disclaimer="Exchange rates are indicative and may differ from actual market rates. Rates are updated periodically. For large transactions, confirm rates with your bank or exchange house."
      helpfulTips={helpfulTips}
      helpfulTipsTitle="Currency Tips for Dubai Property"
      helpfulTipsSubtitle="Understand currency considerations when investing in Dubai"
      faqs={faqs}
      faqTitle="Currency FAQ"
      cta={{
        title: "Ready to Invest?",
        description: "Now that you know the costs in your currency, explore Dubai properties.",
        primaryButton: {
          label: "Browse Properties",
          href: "/destinations/dubai/off-plan",
        },
        secondaryButton: {
          label: "Calculate Fees",
          href: "/destinations/dubai/tools/fees-calculator",
        },
      }}
    />
  );
}
