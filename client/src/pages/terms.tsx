import { PublicLayout } from "@/components/public-layout";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  FileText,
  Building2,
  Mail,
  Shield,
  Users,
  Scale,
  Globe,
  AlertTriangle,
  Lock,
  Accessibility,
  Gavel,
  CheckCircle,
  BookOpen,
  Handshake,
  Eye,
  RefreshCw,
} from "lucide-react";

const termsMascot = "/logos/Mascot_for_Dark_Background.png";

export default function TermsPage() {
  const { t } = useTranslation();
  const { isRTL, localePath } = useLocale();

  useDocumentMeta({
    title: t("pages.terms.metaTitle"),
    description: t("pages.terms.metaDescription"),
  });

  const keyPoints = [
    {
      icon: Globe,
      title: t("pages.terms.keyPoints.editorial.title"),
      description: t("pages.terms.keyPoints.editorial.description"),
    },
    {
      icon: Handshake,
      title: t("pages.terms.keyPoints.affiliate.title"),
      description: t("pages.terms.keyPoints.affiliate.description"),
    },
    {
      icon: Eye,
      title: t("pages.terms.keyPoints.aiGenerated.title"),
      description: t("pages.terms.keyPoints.aiGenerated.description"),
    },
    {
      icon: Shield,
      title: t("pages.terms.keyPoints.privacy.title"),
      description: t("pages.terms.keyPoints.privacy.description"),
    },
  ];

  return (
    <PublicLayout>
      <div dir={isRTL ? "rtl" : "ltr"}>
        {/* Hero Section with gradient and mascot */}
        <section className="relative pt-28 pb-20 overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#6443F4]/10 via-[#6443F4]/5 to-white dark:from-[#6443F4]/20 dark:via-[#6443F4]/10 dark:to-background" />

          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#6443F4]/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-10 w-80 h-80 bg-[#6443F4]/10 rounded-full blur-3xl" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Hero Content */}
              <div className="text-center lg:text-start">
                <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-[#6443F4]/20">
                  <FileText className="w-4 h-4 text-[#6443F4]" />
                  <span className="text-sm font-medium text-[#6443F4]">
                    {t("pages.terms.badge")}
                  </span>
                </div>

                <h1
                  className="text-4xl md:text-5xl font-bold mb-6 font-chillax"
                  data-testid="heading-terms"
                >
                  <span className="text-[#6443F4]">{t("pages.terms.title")}</span>
                </h1>

                <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                  {t("pages.terms.subtitle")}
                </p>

                <p className="text-sm text-muted-foreground">{t("pages.terms.lastUpdated")}</p>
              </div>

              {/* Mascot Visual */}
              <div className="relative flex justify-center">
                <div className="relative">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#6443F4]/30 to-[#6443F4]/30 rounded-3xl blur-2xl transform scale-110" />

                  {/* Mascot image with glassmorphism frame */}
                  <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-3xl p-4 shadow-xl border border-white/30">
                    <img
                      src={termsMascot}
                      alt="TRAVI mascot duck character in sunglasses reviewing legal documents and terms of service paperwork"
                      className="w-64 h-64 object-cover rounded-2xl"
                    />

                    {/* Badge overlay */}
                    <div className="absolute -bottom-4 -right-4 bg-gradient-to-br from-[#6443F4] to-[#6443F4] rounded-full p-3 shadow-lg">
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Points Grid */}
        <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {keyPoints.map((point, index) => (
                <div
                  key={index}
                  className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20 shadow-sm"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-[#6443F4]/10 to-[#6443F4]/10 flex items-center justify-center mb-3">
                    <point.icon className="w-6 h-6 text-[#6443F4]" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{point.title}</h4>
                  <p className="text-xs text-muted-foreground">{point.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Important Notice */}
        <section className="py-8 bg-white dark:bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      {t("pages.terms.importantNotice")}
                    </h3>
                    {/* OUT_OF_SCOPE: Legal body text */}
                    <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                      These Terms constitute a legally binding agreement between you and the
                      operator of TRAVI World. By accessing or using this Website, you agree to be
                      bound by these Terms. If you do not agree, do not use the Website.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16 bg-white dark:bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <Card className="border-l-4 border-l-[#6443F4]">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.operator")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* OUT_OF_SCOPE: Legal body text */}
                <p className="text-muted-foreground leading-relaxed">
                  TRAVI World ("https://travi.world", the "Website", "Platform", "we", "us", "our")
                  is operated by{" "}
                  <strong className="text-foreground">KBR Global Creative Consulting Ltd</strong>, a
                  private company limited by shares incorporated in Gibraltar (Company No. 125571)
                  with its registered office at:
                </p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="font-medium">Suite 4.3.02, Block 4, Eurotowers</p>
                  <p className="text-muted-foreground">Gibraltar GX11 1AA, Gibraltar</p>
                </div>
                <p className="text-muted-foreground">
                  For general and legal inquiries, contact us at:{" "}
                  <a
                    href="mailto:info@travi.world"
                    className="text-[#6443F4] hover:underline font-medium"
                    data-testid="link-contact-email"
                  >
                    info@travi.world
                  </a>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.purpose")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <p>
                  TRAVI World is a digital media and editorial platform dedicated to travel and
                  tourism contents. We publish travel-related news, destination guides, attraction
                  reviews, hotel information, and curated outbound links to third-party service
                  providers (such as Booking.com, GetYourGuide, Viator, Skyscanner, Expedia, and
                  others).
                </p>
                <div className="bg-[#6443F4]/5 rounded-lg p-4 border border-[#6443F4]/10">
                  <p className="font-medium text-foreground">
                    We do not sell any products or services directly and do not process bookings or
                    payments.
                  </p>
                </div>
                <p>
                  All transactions with third-party providers are governed solely by those
                  providers' respective terms and conditions. Use of the Website is permitted for
                  personal, non-commercial purposes only and is subject to these Terms, our{" "}
                  <Link
                    href={localePath("/privacy")}
                    className="text-[#6443F4] hover:underline font-medium"
                  >
                    Privacy Policy
                  </Link>
                  , and our{" "}
                  <Link
                    href={localePath("/cookies")}
                    className="text-[#6443F4] hover:underline font-medium"
                  >
                    Cookie Policy
                  </Link>
                  , all of which are incorporated herein by reference.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <Scale className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.affiliateDisclosure")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Affiliate Links</h4>
                  <p>
                    Some links on the Website are affiliate links. If you click an affiliate link
                    and subsequently make a purchase or booking, we may earn a commission at no
                    additional cost to you. We disclose material connections and mark sponsored
                    contents in compliance with the U.S. Federal Trade Commission (FTC) Endorsement
                    Guides, the EU Digital Services Act, and other applicable regulations.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Third-Party Responsibility</h4>
                  <p>
                    All bookings, purchases, payments, and customer service matters are handled
                    exclusively by the relevant third-party provider. We are not a travel agent,
                    tour operator, booking service, payment processor, or travel provider. We do not
                    control third-party services and bear no responsibility for their acts,
                    omissions, pricing, availability, or policies. You must direct any inquiries,
                    complaints, cancellations, or refund requests to the applicable provider.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.aiDisclaimer")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-amber-900 dark:text-amber-100 leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <div>
                  <h4 className="font-semibold mb-2">Automated Content Creation</h4>
                  <p>
                    This Website operates autonomously using artificial intelligence (AI) systems.
                    Content is automatically collected, generated, translated, and published by AI
                    tools with limited human oversight. While we strive for accuracy, AI-generated
                    contents may contain errors, inaccuracies, omissions, outdated information, or
                    time-sensitive material that may no longer be current.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">No Professional Advice</h4>
                  <p>
                    Content on this Website, whether AI-generated or otherwise, does not constitute
                    professional, legal, medical, financial, or personalized travel advice. Such
                    contents must not be relied upon as a substitute for consultation with qualified
                    professionals or verification with official sources (including government
                    websites, embassies, airlines, and hotels).
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">User Responsibility</h4>
                  <p>
                    You acknowledge and accept full responsibility for independently verifying all
                    information before making travel-related decisions, including but not limited to
                    visa requirements, entry restrictions, health advisories, safety conditions,
                    pricing, and availability.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.newsletter")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <p>
                  We offer an optional newsletter service for users who wish to receive travel
                  updates, destination highlights, and promotional contents. By subscribing to our
                  newsletter, you:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    "Consent to receive periodic emails from TRAVI World",
                    "Confirm your email address is accurate and yours",
                    "May unsubscribe at any time via email link",
                    "Acknowledge processing per our Privacy Policy",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[#6443F4] mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.userConduct")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <p>By using the Website, you agree not to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    Use the Website for any unlawful, harmful, defamatory, obscene, or abusive
                    purpose
                  </li>
                  <li>Infringe upon the intellectual property or privacy rights of others</li>
                  <li>Interfere with or disrupt the Website or its underlying infrastructure</li>
                  <li>Upload or transmit malware, spyware, viruses, or other harmful code</li>
                  <li>
                    Engage in unauthorized scraping, data extraction, data mining, or bulk copying
                    of contents
                  </li>
                  <li>
                    Use bots, crawlers, spiders, or other automated tools (including AI agents) to
                    access or reproduce contents without our prior written consent
                  </li>
                  <li>Misrepresent your identity or affiliation with any person or entity</li>
                  <li>Circumvent any access controls, rate limits, or security features</li>
                  <li>
                    Attempt to reverse-engineer, decompile, or extract source code from the Website
                  </li>
                </ul>
                <div className="bg-[#6443F4]/5 rounded-lg p-4 border border-[#6443F4]/10">
                  <p className="font-medium text-foreground">
                    We reserve the right to suspend or terminate your access without prior notice
                    for any violation of these Terms.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.intellectualProperty")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <p>
                  Unless otherwise credited, all original contents on the Website—including
                  articles, text, graphics, layout, design, trademarks, logos, software, and
                  compilations—is the intellectual property of TRAVI World or its licensors and is
                  protected by applicable copyright, trademark, and other intellectual property
                  laws.
                </p>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Limited License</h4>
                  <p>
                    Subject to these Terms, we grant you a limited, revocable, non-exclusive,
                    non-transferable, non-sublicensable license to access and use the Website for
                    personal, non-commercial purposes only. Any other use—including reproduction,
                    distribution, modification, public display, commercial exploitation, or creation
                    of derivative works—requires our prior written consent.
                  </p>
                </div>
                <p>
                  Certain images, media, or data may be sourced via third-party APIs or licensed
                  databases. In such cases, all rights remain with the respective owners and such
                  contents is used under license or applicable legal exceptions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.dmca")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <p>
                  If you believe that contents on the Website infringes your intellectual property
                  rights, please send a written notice to our Designated Agent:
                </p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p>
                    <strong className="text-foreground">DMCA/Notice Agent:</strong> Legal
                    Department, KBR Global Creative Consulting Ltd
                  </p>
                  <p>
                    <strong className="text-foreground">Email:</strong>{" "}
                    <a
                      href="mailto:info@travi.world"
                      className="text-[#6443F4] hover:underline"
                      data-testid="link-dmca-email"
                    >
                      info@travi.world
                    </a>{" "}
                    (subject line: "DMCA Notice")
                  </p>
                  <p>
                    <strong className="text-foreground">Postal Address:</strong> Suite 4.3.02, Block
                    4, Eurotowers, Gibraltar GX11 1AA, Gibraltar
                  </p>
                </div>
                <p>
                  Your notice must include: (a) identification of the copyrighted work claimed to be
                  infringed; (b) the specific URL or location of the allegedly infringing material;
                  (c) your full contact details (name, address, telephone, email); (d) a statement
                  that you have a good-faith belief that the use is not authorized by the rights
                  holder; and (e) a statement, under penalty of perjury, that the information in the
                  notice is accurate and that you are authorized to act on behalf of the rights
                  holder.
                </p>
                <p>
                  Upon receipt of a valid notice, we will expeditiously remove or disable access to
                  the allegedly infringing material and, where applicable, notify the party
                  responsible for posting it.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.disclaimers")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2">"AS IS" and "AS AVAILABLE"</h4>
                  <p>
                    The Website and all contents are provided on an "as is" and "as available"
                    basis, without warranties of any kind, whether express, implied, or statutory.
                    This includes, without limitation, implied warranties of accuracy, completeness,
                    timeliness, non-infringement, merchantability, and fitness for a particular
                    purpose.
                  </p>
                </div>
                <p>
                  We do not warrant that the Website will be uninterrupted, secure, or error-free,
                  that defects will be corrected, or that the Website or servers are free of viruses
                  or harmful components. Travel information—including prices, availability,
                  schedules, and conditions—may change without notice.
                </p>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Third-Party Content</h4>
                  <p>
                    We do not endorse and are not responsible for any third-party websites,
                    contents, products, or services linked from or referenced on the Website.
                    Accessing third-party websites is entirely at your own risk, and you should
                    review their respective terms and privacy policies.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <Scale className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.liability")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Limitation of Liability</h4>
                  <p>
                    To the maximum extent permitted by applicable law, TRAVI World, KBR Global
                    Creative Consulting Ltd, and their respective directors, officers, employees,
                    agents, affiliates, and partners shall not be liable for any indirect,
                    incidental, special, consequential, punitive, or exemplary damages. This
                    includes, without limitation, damages for loss of profits, data, goodwill,
                    business opportunities, or other intangible losses arising out of or related to
                    your use of (or inability to use) the Website or any reliance on its contents.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Aggregate Liability Cap</h4>
                  <p>
                    To the extent any liability cannot be lawfully excluded, our total aggregate
                    liability for all claims relating to the Website shall not exceed one hundred US
                    dollars (USD $100).
                  </p>
                </div>
                <p className="text-sm">
                  Some jurisdictions do not permit certain exclusions or limitations of liability.
                  In such jurisdictions, the above limitations shall apply only to the fullest
                  extent permitted by applicable law.
                </p>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Force Majeure</h4>
                  <p>
                    We shall not be liable for any delay or failure to perform our obligations due
                    to causes beyond our reasonable control, including but not limited to acts of
                    God, natural disasters, pandemics, epidemics, cyberattacks, war, terrorism,
                    civil unrest, governmental actions, strikes, labor disputes, or failures of
                    networks, utilities, or third-party services.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.indemnification")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <p>
                  You agree to indemnify, defend, and hold harmless TRAVI World, KBR Global Creative
                  Consulting Ltd, and their respective directors, officers, employees, agents,
                  affiliates, and partners from and against any and all claims, liabilities,
                  damages, losses, costs, and expenses (including reasonable legal fees and court
                  costs) arising out of or related to: (a) your breach of these Terms; (b) your use
                  or misuse of the Website; (c) your violation of any applicable law, regulation, or
                  third-party rights; or (d) any contents you submit or transmit through the
                  Website.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.privacyCookies")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <p>
                  Our data collection and processing practices are described in detail in our{" "}
                  <Link
                    href={localePath("/privacy")}
                    className="text-[#6443F4] hover:underline font-medium"
                    data-testid="link-privacy-policy"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href={localePath("/cookies")}
                    className="text-[#6443F4] hover:underline font-medium"
                    data-testid="link-cookie-policy"
                  >
                    Cookie Policy
                  </Link>
                  . The following is a summary of key points:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    "Limited personal data collection",
                    "Industry-standard analytics tools",
                    "Cookie consent for EU/EEA users",
                    "GDPR & UK GDPR compliant",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Your Rights</h4>
                  <p>
                    Depending on your jurisdiction, you may have rights regarding your personal
                    data, including the right to access, rectify, delete, or port your data, and the
                    right to object to or restrict certain processing. California residents may have
                    additional rights under the CCPA/CPRA. For details, please see our Privacy
                    Policy or contact us at{" "}
                    <a
                      href="mailto:privacy@travi.world"
                      className="text-[#6443F4] hover:underline"
                      data-testid="link-privacy-email"
                    >
                      privacy@travi.world
                    </a>
                    .
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <Accessibility className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.accessibility")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <p>
                  We are committed to digital accessibility and strive to ensure that the Website
                  conforms to the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA
                  standards. If you experience any difficulty accessing contents or functionality on
                  the Website, please contact us at{" "}
                  <a
                    href="mailto:info@travi.world"
                    className="text-[#6443F4] hover:underline"
                    data-testid="link-accessibility-email"
                  >
                    info@travi.world
                  </a>{" "}
                  (subject line: "Accessibility"). We will make reasonable efforts to provide the
                  requested information in an alternative format and to remediate accessibility
                  barriers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <Gavel className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.governingLaw")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Governing Law</h4>
                  <p>
                    These Terms and any dispute arising out of or relating to them or your use of
                    the Website shall be governed by and construed in accordance with the laws of
                    Gibraltar, without regard to its conflict-of-law principles.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Dispute Resolution</h4>
                  <p>
                    Before commencing formal proceedings, you agree to attempt in good faith to
                    resolve any dispute by contacting us at info@travi.world. If informal resolution
                    is unsuccessful after thirty (30) days, either party may pursue remedies in
                    accordance with this section.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Exclusive Jurisdiction</h4>
                  <p>
                    Any legal action or proceeding arising out of or relating to these Terms shall
                    be brought exclusively in the courts of Gibraltar, and you consent to the
                    personal jurisdiction of such courts. Notwithstanding the foregoing, we retain
                    the right to seek injunctive or other equitable relief in any court of competent
                    jurisdiction to protect our intellectual property or prevent irreparable harm.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Class Action Waiver</h4>
                  <p>
                    To the extent permitted by applicable law, you waive any right to pursue claims
                    against us on a class, consolidated, or representative basis.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-white" />
                  </div>
                  {t("pages.terms.sections.modifications")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                {/* OUT_OF_SCOPE: Legal body text */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Modifications</h4>
                  <p>
                    We may modify these Terms at any time by posting an updated version on this page
                    with a revised "Last Updated" date. Material changes will be announced via a
                    prominent notice on the Website or by email (if you have provided one). Your
                    continued use of the Website after changes take effect constitutes acceptance of
                    the revised Terms.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Severability</h4>
                  <p>
                    If any provision of these Terms is held invalid, illegal, or unenforceable by a
                    court or tribunal of competent jurisdiction, such provision shall be modified to
                    the minimum extent necessary to make it enforceable, or, if not possible,
                    severed. The remainder of the Terms shall remain in full force and effect.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Waiver</h4>
                  <p>
                    Our failure to enforce any right or provision shall not constitute a waiver of
                    that right or provision unless expressly acknowledged in writing.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Entire Agreement</h4>
                  <p>
                    These Terms, together with the Privacy Policy, Cookie Policy, and any other
                    policies referenced herein, constitute the entire agreement between you and
                    TRAVI World concerning your use of the Website and supersede all prior or
                    contemporaneous communications, whether written or oral.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Termination</h4>
                  <p>
                    We may, at our sole discretion and without prior notice, suspend or terminate
                    your access to the Website at any time for any reason, including breach of these
                    Terms. Upon termination, all licenses granted to you immediately cease, and you
                    must discontinue your use of the Website.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Footer Section */}
        <section className="py-16 bg-gradient-to-r from-[#6443F4] to-[#6443F4]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 font-chillax">
              Questions About These Terms?
            </h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              If you have any questions about these Terms & Conditions, please don't hesitate to
              contact our legal team.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <a
                href="mailto:info@travi.world?subject=Terms%20Inquiry"
                className="inline-flex items-center gap-2 bg-white text-[#6443F4] px-6 py-3 rounded-lg font-medium transition-colors"
                data-testid="button-contact-legal"
              >
                <Mail className="w-4 h-4" />
                Contact Legal Team
              </a>
            </div>

            <div className="border-t border-white/20 pt-8">
              <p className="text-white/60 text-sm mb-4">Related Legal Documents</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href={localePath("/privacy")} data-testid="link-footer-privacy">
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white">
                    <Lock className="w-4 h-4 mr-2" />
                    Privacy Policy
                  </Button>
                </Link>
                <Link href={localePath("/cookies")} data-testid="link-footer-cookies">
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white">
                    <Eye className="w-4 h-4 mr-2" />
                    Cookie Policy
                  </Button>
                </Link>
                <Link href={localePath("/security")} data-testid="link-footer-security">
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white">
                    <Shield className="w-4 h-4 mr-2" />
                    Security Policy
                  </Button>
                </Link>
                <Link
                  href={localePath("/affiliate-disclosure")}
                  data-testid="link-footer-affiliate"
                >
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white">
                    <Handshake className="w-4 h-4 mr-2" />
                    Affiliate Disclosure
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
