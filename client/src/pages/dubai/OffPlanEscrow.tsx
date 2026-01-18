import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Shield,
  Lock,
  Building2,
  FileText,
  CheckCircle2,
  Scale,
  Eye,
  Landmark,
  DollarSign,
  AlertCircle,
  Award,
  Users,
} from "lucide-react";

export default function OffPlanEscrow() {
  return (
    <DubaiOffPlanTemplate
      title="Dubai Escrow Accounts 2026 - Off-Plan Buyer Protection"
      metaDescription="Understand Dubai's escrow account system for off-plan purchases. How RERA protects buyers, escrow regulations, and developer compliance explained."
      canonicalPath="/destinations/dubai/off-plan/escrow"
      keywords={["dubai escrow account", "rera escrow", "off-plan protection", "buyer protection dubai", "escrow law dubai"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Escrow", href: "/destinations/dubai/off-plan/escrow" },
      ]}
      hero={{
        title: "Escrow Protection in Dubai",
        subtitle: "How Dubai's escrow system protects off-plan buyers with regulated accounts and strict developer oversight",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "RERA Regulated" },
          { label: "Buyer Protection" },
          { label: "Secure Funds" },
        ],
      }}
      marketStats={[
        { value: "100%", label: "Deposited", description: "Buyer payments" },
        { value: "RERA", label: "Regulated", description: "Government oversight" },
        { value: "Milestone", label: "Release", description: "Construction-linked" },
        { value: "Law 8/2007", label: "Legislation", description: "Legal framework" },
      ]}
      marketStatsTitle="Escrow System Overview"
      marketStatsSubtitle="Understanding Dubai's robust buyer protection framework"
      highlights={[
        {
          icon: Lock,
          title: "Secure Accounts",
          description: "All buyer payments deposited into regulated bank escrow accounts, not developer operating accounts.",
        },
        {
          icon: Eye,
          title: "RERA Oversight",
          description: "Dubai's Real Estate Regulatory Agency monitors all escrow accounts and developer compliance.",
        },
        {
          icon: Building2,
          title: "Milestone Releases",
          description: "Funds released to developers only upon verified completion of construction milestones.",
        },
        {
          icon: Shield,
          title: "Refund Protection",
          description: "If projects are cancelled, funds in escrow are returned to buyers through a regulated process.",
        },
      ]}
      highlightsTitle="How Escrow Works"
      highlightsSubtitle="The mechanisms that protect your off-plan investment"
      investmentBenefits={[
        {
          icon: Scale,
          title: "Legal Framework",
          description: "Dubai's Law No. 8 of 2007 (Escrow Law) mandates all off-plan sales use escrow accounts. This is not optional - it's the law, providing uniform protection for all buyers.",
        },
        {
          icon: Landmark,
          title: "Government Guarantee",
          description: "RERA, a government body, oversees the entire system. Developer non-compliance results in penalties, license suspension, or project takeover.",
        },
        {
          icon: DollarSign,
          title: "Fund Security",
          description: "Your money sits in a bank escrow account, not with the developer. Developers access funds only after proving construction progress to RERA-appointed engineers.",
        },
        {
          icon: CheckCircle2,
          title: "Milestone Verification",
          description: "Independent engineers verify each construction milestone before funds are released. This ensures your payments correspond to actual building progress.",
        },
        {
          icon: AlertCircle,
          title: "Project Failure Protection",
          description: "If a project fails, RERA oversees the process: either appointing new developers to complete the project or returning funds to buyers from the escrow account.",
        },
        {
          icon: Award,
          title: "Transparency",
          description: "Buyers can verify project registration and escrow status through RERA's public systems. This transparency builds confidence in the off-plan market.",
        },
      ]}
      investmentBenefitsTitle="Buyer Protections"
      investmentBenefitsSubtitle="How Dubai's escrow system safeguards your investment"
      faqs={[
        {
          question: "What is an escrow account in Dubai real estate?",
          answer: "An escrow account is a regulated bank account where developers deposit buyer payments. Funds are only released to developers upon completion of construction milestones verified by RERA-appointed engineers. This protects buyers from developer misuse of funds.",
        },
        {
          question: "Is my money safe in escrow?",
          answer: "Yes, escrow accounts are regulated by RERA (Real Estate Regulatory Agency). Developers cannot access funds without meeting construction milestones. The system is backed by UAE law and government oversight.",
        },
        {
          question: "What if a developer doesn't complete the project?",
          answer: "If a project is cancelled, funds in escrow are returned to buyers. RERA oversees the process and can appoint new developers to complete stalled projects in some cases. Buyers have legal recourse through Dubai courts if needed.",
        },
        {
          question: "How do I verify a project has proper escrow?",
          answer: "Check RERA's Trakheesi system to verify project registration and escrow account status. All legally-compliant off-plan projects have registered escrow accounts. If a project isn't registered, do not proceed.",
        },
        {
          question: "When are escrow funds released to developers?",
          answer: "Funds are released in tranches based on construction milestones: typically at foundation, structure completion, MEP (mechanical/electrical/plumbing), and final finishing. Each release requires verification by RERA-approved engineers.",
        },
      ]}
      cta={{
        title: "Invest with Confidence",
        description: "All our featured projects are RERA-registered with proper escrow protection",
        primaryButtonText: "View Protected Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/escrow#how-it-works",
        secondaryButtonText: "Learn More About RERA",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}
