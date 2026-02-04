import { PublicLayout } from "@/components/public-layout";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCookieConsent } from "@/contexts/cookie-consent-context";
import { Link } from "wouter";
import {
  Cookie,
  Shield,
  BarChart3,
  Globe,
  Settings,
  AlertCircle,
  RefreshCw,
  Mail,
  CheckCircle,
  Lock,
  Eye,
} from "lucide-react";

const cookiesMascot = "/logos/Mascot_for_Dark_Background.png";

export default function CookiesPage() {
  const { localePath } = useLocale();
  useDocumentMeta({
    title: "Cookie Policy | TRAVI World",
    description:
      "Learn about how TRAVI World uses cookies and similar technologies on our website.",
  });

  const { openSettings: openCookieSettings } = useCookieConsent();

  const cookieFeatures = [
    { icon: Shield, title: "Essential Cookies", description: "Required for basic functionality" },
    { icon: BarChart3, title: "Analytics Cookies", description: "Help us improve your experience" },
    { icon: Settings, title: "Preference Control", description: "You decide what we track" },
    { icon: Lock, title: "Privacy First", description: "IP anonymization enabled" },
  ];

  return (
    <PublicLayout>
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
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-[#6443F4]/20">
                <Cookie className="w-4 h-4 text-[#6443F4]" />
                <span className="text-sm font-medium text-[#6443F4]">Transparency Matters</span>
              </div>

              <h1
                className="text-4xl md:text-5xl font-bold mb-6 font-chillax"
                data-testid="heading-cookies"
              >
                <span className="text-[#6443F4]">Cookie Policy</span>
              </h1>

              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                We believe in transparency about how we use cookies and similar technologies. Learn
                about our practices and manage your preferences anytime.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  onClick={openCookieSettings}
                  className="gap-2 bg-[#6443F4] hover:bg-[#5339D9] text-white"
                  data-testid="button-manage-cookies-hero"
                >
                  <Settings className="w-4 h-4" />
                  Manage Cookie Settings
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mt-6">Effective Date: 1 January 2026</p>
            </div>

            {/* Mascot Visual */}
            <div className="relative flex justify-center">
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#6443F4]/30 to-[#6443F4]/30 rounded-3xl blur-2xl transform scale-110" />

                {/* Mascot image with glassmorphism frame */}
                <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-3xl p-4 shadow-xl border border-white/30">
                  <img
                    src={cookiesMascot}
                    alt="TRAVI mascot duck character relaxing on pink floatie eating chocolate chip cookies with coconut drink"
                    className="w-64 h-64 object-cover rounded-2xl"
                  />

                  {/* Cookie badge overlay */}
                  <div className="absolute -bottom-4 -right-4 bg-gradient-to-br from-[#6443F4] to-[#6443F4] rounded-full p-3 shadow-lg">
                    <Cookie className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cookie Features Grid */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cookieFeatures.map((feature, index) => (
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

      {/* Main Content */}
      <section className="py-16 bg-white dark:bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <p className="text-muted-foreground leading-relaxed">
            This Cookie Policy explains how KBR Global Creative Consulting Ltd ("TRAVI World", "we",
            "us") uses cookies and similar technologies on https://travi.world (the "Website"). This
            policy should be read together with our Privacy Policy.
          </p>

          <Card className="border-l-4 border-l-[#6443F4]">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-white" />
                </div>
                1. What Are Cookies?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                Cookies are small text files that are stored on your device (computer, tablet, or
                mobile) when you visit a website. They help websites remember information about your
                visit, such as your preferences and settings, making your next visit easier and more
                useful.
              </p>
              <p>
                We also use similar technologies such as pixels, local storage, and session storage,
                which function in a similar way. In this policy, we refer to all these technologies
                collectively as "cookies."
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                2. Types of Cookies We Use
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  2.1 Essential Cookies (Always Active)
                </h3>
                <p className="text-muted-foreground mb-4">
                  These cookies are necessary for the Website to function properly. They enable
                  basic features like page navigation, security, and access to secure areas. The
                  Website cannot function properly without these cookies, and they cannot be
                  disabled.
                </p>
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-sm border-collapse"
                    data-testid="table-essential-cookies"
                  >
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-semibold">Cookie Name</th>
                        <th className="text-left p-3 font-semibold">Provider</th>
                        <th className="text-left p-3 font-semibold">Purpose</th>
                        <th className="text-left p-3 font-semibold">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="p-3 font-mono text-xs">cookie_consent</td>
                        <td className="p-3">TRAVI World</td>
                        <td className="p-3">Stores your cookie preferences</td>
                        <td className="p-3">1 year</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-mono text-xs">__cf_bm</td>
                        <td className="p-3">Cloudflare</td>
                        <td className="p-3">Bot protection and security</td>
                        <td className="p-3">30 minutes</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  2.2 Analytics Cookies (Require Consent)
                </h3>
                <p className="text-muted-foreground mb-4">
                  These cookies help us understand how visitors interact with our Website by
                  collecting and reporting information anonymously. This helps us improve our
                  contents and user experience. These cookies are only set after you provide
                  consent.
                </p>
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-sm border-collapse"
                    data-testid="table-analytics-cookies"
                  >
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-semibold">Cookie Name</th>
                        <th className="text-left p-3 font-semibold">Provider</th>
                        <th className="text-left p-3 font-semibold">Purpose</th>
                        <th className="text-left p-3 font-semibold">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="p-3 font-mono text-xs">_ga</td>
                        <td className="p-3">Google Analytics</td>
                        <td className="p-3">Distinguishes unique users</td>
                        <td className="p-3">2 years</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-mono text-xs">_ga_[ID]</td>
                        <td className="p-3">Google Analytics</td>
                        <td className="p-3">Maintains session state</td>
                        <td className="p-3">2 years</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-mono text-xs">_gid</td>
                        <td className="p-3">Google Analytics</td>
                        <td className="p-3">Distinguishes users</td>
                        <td className="p-3">24 hours</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-mono text-xs">_gat</td>
                        <td className="p-3">Google Analytics</td>
                        <td className="p-3">Throttles request rate</td>
                        <td className="p-3">1 minute</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
                  <strong>Note:</strong> We use Google Analytics with IP anonymization enabled to
                  protect your privacy. This means your full IP address is never stored.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                3. Third-Party Cookies
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                When you click on affiliate links on our Website, you will be redirected to
                third-party websites (such as Booking.com, Expedia, GetYourGuide, etc.). These
                websites may set their own cookies, which are governed by their respective privacy
                and cookie policies. We have no control over these third-party cookies.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                4. Managing Your Cookie Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                You have several options for managing cookies:
              </p>

              <div>
                <h3 className="text-base font-semibold mb-2">4.1 Our Cookie Consent Tool</h3>
                <p className="text-muted-foreground mb-4">
                  When you first visit our Website, you will see a cookie banner that allows you to
                  accept or reject non-essential cookies. You can change your preferences at any
                  time by clicking the button below or the "Cookie Settings" link in the website
                  footer.
                </p>
                <Button
                  onClick={openCookieSettings}
                  variant="outline"
                  className="gap-2"
                  data-testid="button-manage-cookies"
                >
                  <Settings className="w-4 h-4" />
                  Manage Cookie Settings
                </Button>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-2">4.2 Browser Settings</h3>
                <p className="text-muted-foreground mb-3">
                  Most web browsers allow you to control cookies through their settings. You can
                  typically:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    "View what cookies are stored on your device",
                    "Delete all or specific cookies",
                    "Block all cookies or only third-party cookies",
                    "Set your browser to notify you when a cookie is set",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#6443F4] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground mt-4">
                  For instructions on managing cookies in your specific browser:
                </p>
                <div className="flex flex-wrap gap-3 mt-2">
                  <a
                    href="https://support.google.com/chrome/answer/95647"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#6443F4] hover:underline"
                  >
                    Chrome
                  </a>
                  <span className="text-muted-foreground">•</span>
                  <a
                    href="https://support.mozilla.org/en-US/kb/cookies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#6443F4] hover:underline"
                  >
                    Firefox
                  </a>
                  <span className="text-muted-foreground">•</span>
                  <a
                    href="https://support.apple.com/guide/safari/manage-cookies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#6443F4] hover:underline"
                  >
                    Safari
                  </a>
                  <span className="text-muted-foreground">•</span>
                  <a
                    href="https://support.microsoft.com/en-us/microsoft-edge/cookies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#6443F4] hover:underline"
                  >
                    Edge
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-2">4.3 Opt-Out Tools</h3>
                <p className="text-muted-foreground">
                  You can opt out of Google Analytics tracking by installing the{" "}
                  <a
                    href="https://tools.google.com/dlpage/gaoptout"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6443F4] hover:underline"
                  >
                    Google Analytics Opt-out Browser Add-on
                  </a>
                  .
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                5. Impact of Blocking Cookies
              </CardTitle>
            </CardHeader>
            <CardContent className="text-amber-900 dark:text-amber-100 space-y-4">
              <p>If you choose to block or delete cookies, please note that:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  "Essential cookies cannot be disabled as they are necessary for the Website to function",
                  "Blocking analytics cookies will not affect your ability to use the Website",
                  "Your cookie preferences may be reset if you delete the cookie that stores your choices",
                  "Some features may not work as intended",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
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
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                6. Updates to This Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                We may update this Cookie Policy from time to time to reflect changes in our
                practices or for other operational, legal, or regulatory reasons. The "Effective
                Date" at the top of this policy indicates when it was last updated. We encourage you
                to review this policy periodically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                7. Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-3">
              <p>If you have any questions about our use of cookies, please contact us:</p>
              <div className="space-y-2">
                <p>
                  <strong>Email:</strong>{" "}
                  <a href="mailto:privacy@travi.world" className="text-[#6443F4] hover:underline">
                    privacy@travi.world
                  </a>
                </p>
                <p>
                  <strong>Postal Address:</strong>
                  <br />
                  KBR Global Creative Consulting Ltd
                  <br />
                  Suite 4.3.02, Block 4, Eurotowers
                  <br />
                  Gibraltar GX11 1AA, Gibraltar
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-16 bg-gradient-to-br from-[#6443F4]/5 via-[#6443F4]/5 to-white dark:from-[#6443F4]/10 dark:via-[#6443F4]/10 dark:to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 font-chillax">
            <span className="text-[#6443F4]">Your Privacy, Your Choice</span>
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            We respect your privacy and give you control over your data. Manage your cookie
            preferences anytime or learn more about how we protect your information.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={openCookieSettings}
              className="gap-2 bg-[#6443F4] hover:bg-[#5339D9] text-white"
              data-testid="button-manage-cookies-footer"
            >
              <Settings className="w-4 h-4" />
              Manage Cookie Settings
            </Button>
            <Link href={localePath("/privacy")}>
              <Button variant="outline" className="gap-2" data-testid="link-privacy-policy">
                <Shield className="w-4 h-4" />
                View Privacy Policy
              </Button>
            </Link>
          </div>

          <div className="mt-12 pt-8 border-t border-[#6443F4]/10">
            <p className="text-sm text-muted-foreground">
              © 2026 TRAVI World. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Operated by KBR Global Creative Consulting Ltd, Gibraltar (Company No. 125571)
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
