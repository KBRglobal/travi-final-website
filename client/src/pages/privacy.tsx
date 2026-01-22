import { PublicLayout } from "@/components/public-layout";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Shield, Mail, MapPin, Building2, Globe, Lock, Cookie, Users, 
  FileText, AlertCircle, Baby, RefreshCw, Eye, Database, ShieldCheck, CheckCircle
} from "lucide-react";

const privacyMascot = "/logos/Mascot_for_Dark_Background.png";

export default function PrivacyPage() {
  const { t } = useTranslation();
  const { isRTL, localePath } = useLocale();

  useDocumentMeta({
    title: t("pages.privacy.metaTitle"),
    description: t("pages.privacy.metaDescription"),
  });

  const privacyFeatures = [
    { icon: Shield, title: t("pages.privacy.features.dataProtection.title"), description: t("pages.privacy.features.dataProtection.description") },
    { icon: Lock, title: t("pages.privacy.features.minimalCollection.title"), description: t("pages.privacy.features.minimalCollection.description") },
    { icon: Eye, title: t("pages.privacy.features.transparency.title"), description: t("pages.privacy.features.transparency.description") },
    { icon: Database, title: t("pages.privacy.features.yourControl.title"), description: t("pages.privacy.features.yourControl.description") },
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
                <Shield className="w-4 h-4 text-[#6443F4]" />
                <span className="text-sm font-medium text-[#6443F4]">{t("pages.privacy.badge")}</span>
              </div>
              
              <h1 
                className="text-4xl md:text-5xl font-bold mb-6"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                data-testid="heading-privacy"
              >
                <span className="text-[#6443F4]">
                  {t("pages.privacy.title")}
                </span>
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                {t("pages.privacy.subtitle")}
              </p>

              <p className="text-sm text-muted-foreground" data-testid="text-effective-date">
                {t("pages.privacy.effectiveDate")}
              </p>
            </div>

            {/* Mascot Visual */}
            <div className="relative flex justify-center">
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#6443F4]/30 to-[#6443F4]/30 rounded-3xl blur-2xl transform scale-110" />
                
                {/* Mascot image with glassmorphism frame */}
                <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-3xl p-4 shadow-xl border border-white/30">
                  <img 
                    src={privacyMascot}
                    alt="TRAVI mascot duck character standing on security shield with padlock representing data protection and privacy"
                    className="w-64 h-64 object-cover rounded-2xl"
                  />
                  
                  {/* Shield badge overlay */}
                  <div className="absolute -bottom-4 -right-4 bg-gradient-to-br from-[#6443F4] to-[#6443F4] rounded-full p-3 shadow-lg">
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Features Grid */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {privacyFeatures.map((feature, index) => (
              <div 
                key={index}
                className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20 shadow-sm"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-[#6443F4]/10 to-[#6443F4]/10 flex items-center justify-center mb-3">
                  <feature.icon className="w-6 h-6 text-[#6443F4]" />
                </div>
                <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Intro Card */}
      <section className="py-16 bg-white dark:bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-l-4 border-l-[#6443F4]" data-testid="card-intro">
            <CardContent className="pt-6">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p className="text-muted-foreground leading-relaxed">
                This Privacy Policy explains how KBR Global Creative Consulting Ltd ("TRAVI World", "we", "us", "our") collects, uses, and protects information when you visit https://travi.world (the "Website").
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We are committed to protecting your privacy and being transparent about our data practices. Please read this policy carefully to understand how we handle your information.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-16 bg-white dark:bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <Card data-testid="section-who-we-are">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.whoWeAre")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                TRAVI World is a travel and tourism contents platform operated by:
              </p>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-medium">KBR Global Creative Consulting Ltd</p>
                <p className="text-sm">Company No. 125571</p>
                <p className="text-sm">Suite 4.3.02, Block 4, Eurotowers</p>
                <p className="text-sm">Gibraltar GX11 1AA, Gibraltar</p>
              </div>
              <p>
                For privacy-related inquiries, contact us at:{" "}
                <a href="mailto:privacy@travi.world" className="text-[#6443F4] hover:underline" data-testid="link-privacy-email">
                  privacy@travi.world
                </a>
              </p>
            </CardContent>
          </Card>

          <Card data-testid="section-information-collect">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.informationCollect")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                We collect minimal information to operate our Website effectively:
              </p>
              
              <h3 className="font-medium text-foreground">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Newsletter Subscription:</strong> If you subscribe to our newsletter, we collect your email address. This is voluntary and you can unsubscribe at any time.</li>
                <li><strong>Contact Communications:</strong> If you contact us via email, we collect the information you provide in your message.</li>
              </ul>

              <h3 className="font-medium text-foreground">2.2 Information Collected Automatically</h3>
              <p>
                When you visit our Website, we automatically collect certain technical information through cookies and similar technologies:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "IP address (anonymized where required)",
                  "Browser type and version",
                  "Device type and operating system",
                  "Pages visited and time spent",
                  "Referring website or source",
                  "General geographic location"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-[#6443F4] mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <h3 className="font-medium text-foreground">2.3 Information We Do Not Collect</h3>
              <p>
                Our Website does not require user registration or login. We do not collect:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Names or personal identifiers (unless you provide them voluntarily)</li>
                <li>Payment or financial information</li>
                <li>Government identification documents</li>
                <li>Precise location data</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="section-how-we-use">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.howWeUse")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Website Analytics:</strong> To understand how visitors use our Website, identify popular contents, and improve user experience.</li>
                <li><strong>Newsletter Communications:</strong> To send travel updates, destination highlights, and promotional contents to subscribers who have opted in.</li>
                <li><strong>Affiliate Performance:</strong> To track which affiliate links generate bookings and calculate our commissions (no personal data is used for this purpose).</li>
                <li><strong>Website Security:</strong> To protect against malicious activity, spam, and security threats.</li>
                <li><strong>Legal Compliance:</strong> To comply with applicable laws and respond to lawful requests from authorities.</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="section-legal-basis">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.legalBasis")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                For users in the European Economic Area (EEA) and United Kingdom, we process personal data based on the following legal grounds:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Consent:</strong> For newsletter subscriptions and non-essential cookies (analytics). You may withdraw consent at any time.</li>
                <li><strong>Legitimate Interests:</strong> For website security, fraud prevention, and basic website functionality, where our interests do not override your rights.</li>
                <li><strong>Legal Obligation:</strong> When required to comply with applicable laws or respond to valid legal processes.</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="section-cookies">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.cookies")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                We use cookies and similar technologies to operate and improve our Website.
              </p>
              
              <h3 className="font-medium text-foreground">5.1 Types of Cookies We Use</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for basic website functionality, security, and cookie consent management. These cannot be disabled.</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our Website. We use Google Analytics with IP anonymization enabled. These cookies are only set with your consent.</li>
              </ul>

              <h3 className="font-medium text-foreground">5.2 Managing Cookies</h3>
              <p>
                You can manage your cookie preferences through:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Our cookie consent banner (displayed on your first visit)</li>
                <li>The "Cookie Settings" link in the website footer</li>
                <li>Your browser settings</li>
              </ul>
              <p className="text-sm italic">
                Please note that blocking certain cookies may impact your experience on the Website.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="section-third-party">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.thirdParty")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                We work with trusted third-party service providers to operate our Website:
              </p>
              
              <h3 className="font-medium text-foreground">6.1 Analytics Services</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Google Analytics: Website traffic analysis (with IP anonymization)</li>
                <li>Google Tag Manager: Tag management for analytics implementation</li>
                <li>Google Search Console: Search performance monitoring</li>
              </ul>

              <h3 className="font-medium text-foreground">6.2 Email Service</h3>
              <p>
                Resend: Newsletter delivery service
              </p>

              <h3 className="font-medium text-foreground">6.3 Affiliate Partners</h3>
              <p>
                When you click on affiliate links, you are redirected to third-party websites. These partners include:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {["Booking.com", "Expedia", "GetYourGuide", "Viator", "Skyscanner", "Other travel providers"].map((partner, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#6443F4] flex-shrink-0" />
                    <span className="text-sm">{partner}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Important:</strong> When you leave our Website via an affiliate link, the third party's privacy policy governs their collection and use of your data. We do not receive any personal information about your bookings—only anonymous confirmation that a booking was made (for commission purposes).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="section-ai-contents">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.aiContent")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                Our Website uses artificial intelligence (AI) to generate and publish contents automatically. This AI-generated contents:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Is created using publicly available info",
                  "Does not use visitor personal data",
                  "Is not trained on user behavior",
                  "May contain inaccuracies (verify independently)"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-[#6443F4] mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="section-international-transfers">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.internationalTransfers")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                As we work with international service providers, your information may be transferred to and processed in countries outside your country of residence, including the United States and European Union.
              </p>
              <p>
                For transfers from the EEA/UK, we ensure appropriate safeguards are in place, including:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
                <li>Adequacy decisions where applicable</li>
                <li>Data processing agreements with all service providers</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="section-data-retention">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.dataRetention")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                We retain information only as long as necessary:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Analytics Data:</strong> 14 months (Google Analytics default retention period)</li>
                <li><strong>Newsletter Subscriptions:</strong> Until you unsubscribe, plus a suppression list to honor your opt-out</li>
                <li><strong>Contact Communications:</strong> Up to 2 years for customer service purposes</li>
                <li><strong>Server Logs:</strong> 90 days for security purposes</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="section-privacy-rights">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.privacyRights")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                Depending on your location, you may have the following rights regarding your personal data:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Right to Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data (subject to legal retention requirements).</li>
                <li><strong>Right to Restrict Processing:</strong> Request that we limit how we use your data.</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format.</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interests.</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time (e.g., unsubscribe from newsletter, reject cookies).</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at:{" "}
                <a href="mailto:privacy@travi.world" className="text-[#6443F4] hover:underline">
                  privacy@travi.world
                </a>
              </p>
              <p className="text-sm">
                We will respond to your request within 30 days. If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="section-california-rights">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.californiaRights")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Right to know what personal information we collect, use, and disclose</li>
                <li>Right to delete your personal information</li>
                <li>Right to opt-out of the "sale" or "sharing" of personal information</li>
                <li>Right to non-discrimination for exercising your rights</li>
              </ul>
              <p>
                We do not sell your personal information for monetary consideration. Analytics cookies may constitute "sharing" under CPRA; you can opt-out via our cookie consent tool or by clicking "Do Not Sell or Share My Personal Information" in the website footer.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="section-children-privacy">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Baby className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.childrenPrivacy")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                Our Website is intended for users aged 13 years and older. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal data from a child under 13, we will take steps to delete that information promptly.
              </p>
              <p>
                If you are a parent or guardian and believe your child has provided us with personal information, please contact us at{" "}
                <a href="mailto:privacy@travi.world" className="text-[#6443F4] hover:underline">
                  privacy@travi.world
                </a>
              </p>
            </CardContent>
          </Card>

          <Card data-testid="section-data-security">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.dataSecurity")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                We implement appropriate technical and organizational measures to protect your information, including:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "HTTPS encryption for all data in transit",
                  "Secure hosting infrastructure",
                  "Regular security updates and monitoring",
                  "Limited access on a need-to-know basis"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm italic">
                While we strive to protect your information, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="section-changes">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.changes")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or for other operational reasons. When we make changes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We will update the "Effective Date" at the top of this policy</li>
                <li>For material changes, we will provide prominent notice on our Website</li>
                <li>If you are a newsletter subscriber, we may notify you via email</li>
              </ul>
              <p>
                Your continued use of the Website after changes take effect constitutes acceptance of the updated policy.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="section-contact">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                {t("pages.privacy.sections.contactUs")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              {/* OUT_OF_SCOPE: Legal body text */}
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#6443F4]" />
                  <span>Privacy Inquiries:{" "}
                    <a href="mailto:privacy@travi.world" className="text-[#6443F4] hover:underline" data-testid="link-contact-privacy">
                      privacy@travi.world
                    </a>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#6443F4]" />
                  <span>General Inquiries:{" "}
                    <a href="mailto:info@travi.world" className="text-[#6443F4] hover:underline" data-testid="link-contact-info">
                      info@travi.world
                    </a>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#6443F4] mt-0.5" />
                  <div>
                    <p>Postal Address:</p>
                    <p>KBR Global Creative Consulting Ltd</p>
                    <p>Suite 4.3.02, Block 4, Eurotowers</p>
                    <p>Gibraltar GX11 1AA, Gibraltar</p>
                  </div>
                </div>
              </div>
              <p className="text-sm">
                <strong>EEA/UK Representative:</strong> If you are located in the European Economic Area or United Kingdom and have concerns about our data practices, you may also contact your local data protection authority.
              </p>
            </CardContent>
          </Card>

        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-gradient-to-r from-[#6443F4] to-[#6443F4]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            Questions About Your Privacy?
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            We're committed to transparency. If you have any questions about our privacy 
            practices or how we handle your data, please don't hesitate to reach out.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="mailto:privacy@travi.world" data-testid="link-cta-privacy-email">
              <Button variant="secondary" size="lg" className="bg-white text-[#6443F4] hover:bg-white/90">
                <Mail className="w-4 h-4 mr-2" />
                Contact Privacy Team
              </Button>
            </a>
            <Link href={localePath("/security")} data-testid="link-security-policy">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                <Shield className="w-4 h-4 mr-2" />
                Security Policy
              </Button>
            </Link>
            <Link href={localePath("/cookie-policy")} data-testid="link-cookie-policy">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                <Cookie className="w-4 h-4 mr-2" />
                Cookie Policy
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer copyright */}
      <section className="py-8 bg-white dark:bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground" data-testid="footer-copyright">
          <p>© 2026 TRAVI World. All rights reserved.</p>
          <p className="mt-1">Operated by KBR Global Creative Consulting Ltd, Gibraltar (Company No. 125571)</p>
        </div>
      </section>
      </div>
    </PublicLayout>
  );
}
