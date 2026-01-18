import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Bitcoin,
  Shield,
  Zap,
  Globe,
  Building2,
  CheckCircle2,
  DollarSign,
  Lock,
  Clock,
  FileText,
  TrendingUp,
  Scale,
} from "lucide-react";

export default function OffPlanCryptoPayments() {
  return (
    <DubaiOffPlanTemplate
      title="Buy Dubai Property with Crypto 2026 - Bitcoin & Ethereum"
      metaDescription="Complete guide to buying Dubai property with cryptocurrency. Accept Bitcoin, Ethereum, and stablecoins. Developers accepting crypto and legal considerations."
      canonicalPath="/destinations/dubai/off-plan/crypto"
      keywords={["buy property crypto dubai", "bitcoin real estate dubai", "crypto property purchase", "ethereum dubai property", "cryptocurrency dubai"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Crypto", href: "/destinations/dubai/off-plan/crypto" },
      ]}
      hero={{
        title: "Buy Dubai Property with Crypto",
        subtitle: "Dubai's crypto-friendly real estate market makes it possible to purchase property with Bitcoin, Ethereum, and more",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Bitcoin Accepted" },
          { label: "Ethereum" },
          { label: "USDT" },
        ],
      }}
      marketStats={[
        { value: "10+", label: "Developers", description: "Accept crypto" },
        { value: "BTC, ETH", label: "Accepted", description: "Major cryptocurrencies" },
        { value: "0%", label: "Additional Fee", description: "Most transactions" },
        { value: "24/7", label: "Transactions", description: "No banking hours" },
      ]}
      marketStatsTitle="Crypto Real Estate Overview"
      marketStatsSubtitle="Dubai leads the world in crypto-friendly property transactions"
      highlights={[
        {
          icon: Bitcoin,
          title: "Bitcoin Payments",
          description: "Purchase property directly with Bitcoin. Transactions converted at market rate at time of payment.",
        },
        {
          icon: Shield,
          title: "Legal Framework",
          description: "UAE has established regulatory framework for crypto. Property purchases are recorded normally with DLD.",
        },
        {
          icon: Zap,
          title: "Fast Settlement",
          description: "Bypass traditional banking delays. Crypto transfers settle in minutes, not days.",
        },
        {
          icon: Globe,
          title: "Global Accessibility",
          description: "No international wire fees or currency conversion. Pay from anywhere in the world.",
        },
      ]}
      highlightsTitle="Crypto Advantages"
      highlightsSubtitle="Why more buyers are choosing cryptocurrency for Dubai property"
      investmentBenefits={[
        {
          icon: DollarSign,
          title: "No Banking Barriers",
          description: "Avoid international wire transfer complications, currency controls, and banking delays. Crypto provides a direct payment path regardless of your country of residence.",
        },
        {
          icon: Clock,
          title: "Speed of Transaction",
          description: "What takes 3-5 business days via bank transfer happens in minutes with crypto. Secure your unit faster and avoid losing preferred choices to delays.",
        },
        {
          icon: Lock,
          title: "Privacy Benefits",
          description: "While fully legal and documented, crypto transactions offer more privacy than traditional banking. Buyer information is shared with necessary parties only.",
        },
        {
          icon: TrendingUp,
          title: "Asset Diversification",
          description: "Convert crypto gains into real estate - a tangible asset class. Property provides stability and income that cryptocurrency cannot.",
        },
        {
          icon: FileText,
          title: "Full Legal Protection",
          description: "Crypto purchases receive identical legal protection as traditional purchases. DLD registration, escrow, and title deed processes remain unchanged.",
        },
        {
          icon: Scale,
          title: "Transparent Rates",
          description: "Conversion rates are based on real-time market prices. No hidden fees or unfavorable exchange rates typically seen in international transfers.",
        },
      ]}
      investmentBenefitsTitle="Why Pay with Crypto"
      investmentBenefitsSubtitle="Strategic advantages of cryptocurrency property purchases"
      faqs={[
        {
          question: "Can you buy property in Dubai with Bitcoin?",
          answer: "Yes, several Dubai developers and real estate agencies accept Bitcoin, Ethereum, USDT, and other cryptocurrencies. The transaction is converted at the point of sale at prevailing market rates. The property is registered normally with Dubai Land Department.",
        },
        {
          question: "Is crypto property purchase legal in Dubai?",
          answer: "Yes, cryptocurrency transactions are legal in Dubai. The UAE has established a regulatory framework for crypto assets (VARA), and property purchases with crypto are recognized and recorded normally. You receive the same legal protections as any buyer.",
        },
        {
          question: "Which developers accept cryptocurrency?",
          answer: "Major developers like DAMAC and select Emaar projects accept crypto. Many boutique developers and secondary market agencies also facilitate crypto transactions. Availability varies by project and timing.",
        },
        {
          question: "How does the conversion work?",
          answer: "The property price is set in AED. At time of payment, your crypto is converted at real-time market rates through licensed crypto payment processors. You send crypto, the developer receives AED. No additional conversion fees typically apply.",
        },
        {
          question: "What about volatility during payment?",
          answer: "Conversion happens immediately at the moment of transaction, locking in the rate. For multi-payment plans, each installment converts at the then-current rate. Stablecoins (USDT, USDC) eliminate volatility concerns entirely.",
        },
      ]}
      cta={{
        title: "Buy Property with Cryptocurrency",
        description: "Explore crypto-friendly projects and complete your purchase with Bitcoin or Ethereum",
        primaryButtonText: "View Crypto-Friendly Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/crypto#projects",
        secondaryButtonText: "Speak with Crypto Specialist",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}
