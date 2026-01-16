import { PublicLayout } from "@/components/public-layout";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Shield, Lock, Server, Eye, AlertTriangle, 
  Mail, CheckCircle, Globe, Key, Fingerprint,
  ShieldCheck, RefreshCw
} from "lucide-react";

export default function SecurityPage() {
  useDocumentMeta({
    title: "Security Policy | TRAVI World",
    description: "Learn about TRAVI World's comprehensive security measures and how we protect your data and privacy.",
  });

  const securityFeatures = [
    { icon: Lock, title: "HTTPS Encryption", description: "All traffic encrypted with TLS 1.3" },
    { icon: Fingerprint, title: "Data Protection", description: "Industry-standard security protocols" },
    { icon: RefreshCw, title: "Regular Updates", description: "Continuous security patches" },
    { icon: Key, title: "Access Controls", description: "Strict authentication measures" },
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
                <Shield className="w-4 h-4 text-[#6443F4]" />
                <span className="text-sm font-medium text-[#6443F4]">Your Security Matters</span>
              </div>
              
              <h1 
                className="text-4xl md:text-5xl font-bold mb-6"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                data-testid="heading-security"
              >
                <span className="text-[#6443F4]">
                  Security Policy
                </span>
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                At TRAVI World, we take the security and privacy of your data seriously. 
                Learn about our comprehensive security measures and how we protect your information.
              </p>

              <p className="text-sm text-muted-foreground">
                Last updated: 1 January 2026
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
                    src="/hero/travi-world-mascot-colorful-pool-arches.webp" 
                    alt="TRAVI mascot ensuring your security"
                    className="w-64 h-64 object-cover rounded-2xl"
                  />
                  
                  {/* Security badge overlay */}
                  <div className="absolute -bottom-4 -right-4 bg-gradient-to-br from-[#6443F4] to-[#6443F4] rounded-full p-3 shadow-lg">
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Features Grid */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {securityFeatures.map((feature, index) => (
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
          
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                1. Our Commitment to Security
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                At TRAVI World, we take the security of your data seriously. We implement 
                industry-standard security measures to protect the confidentiality, integrity, 
                and availability of information on our platform. Our commitment extends to 
                continuous improvement of our security practices.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Server className="w-5 h-5 text-white" />
                </div>
                2. Technical Security Measures
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>We employ comprehensive security measures to protect your data:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Secure HTTPS connections for all traffic",
                  "Regular security assessments",
                  "Encryption of data in transit and at rest",
                  "Multi-layer access controls",
                  "Continuous software updates",
                  "Vulnerability scanning and patching"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
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
                  <Lock className="w-5 h-5 text-white" />
                </div>
                3. Data Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                We implement appropriate organizational and technical measures to protect 
                personal data against accidental or unlawful destruction, loss, alteration, 
                unauthorized disclosure, or access. Our data protection practices comply with 
                applicable regulations including GDPR and other data protection laws.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                4. Third-Party Security
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                We carefully select third-party service providers and require them to maintain 
                appropriate security measures. We regularly review our partners' security 
                practices. However, we cannot guarantee the security of third-party services, 
                and recommend reviewing their individual security policies.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                5. Reporting Security Issues
              </CardTitle>
            </CardHeader>
            <CardContent className="text-amber-900 dark:text-amber-100 space-y-4">
              <p>
                If you discover a security vulnerability or have concerns about the security 
                of our website, please contact us immediately. We appreciate responsible 
                disclosure and will investigate all reports promptly.
              </p>
              <a 
                href="mailto:info@travi.world?subject=Security%20Report" 
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                data-testid="button-report-security"
              >
                <Mail className="w-4 h-4" />
                Report a Security Issue
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                6. Your Security Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>You can help protect your information by following these practices:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Keep your browser up to date",
                  "Watch for phishing attempts",
                  "Avoid sharing sensitive info publicly",
                  "Use secure networks"
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
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                7. Policy Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                We may update this security policy from time to time to reflect changes in 
                our practices or for operational, legal, or regulatory reasons. We encourage 
                you to review this policy periodically.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-gradient-to-r from-[#6443F4] to-[#6443F4]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            Questions About Our Security?
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            We're committed to transparency. If you have any questions about our security 
            practices or how we protect your data, please don't hesitate to reach out.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="mailto:info@travi.world" data-testid="link-contact-email">
              <Button variant="secondary" size="lg" className="bg-white text-[#6443F4] hover:bg-white/90">
                <Mail className="w-4 h-4 mr-2" />
                Contact Us
              </Button>
            </a>
            <Link href="/privacy" data-testid="link-privacy-policy">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                <Lock className="w-4 h-4 mr-2" />
                Privacy Policy
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer spacing */}
      <div className="py-8 bg-white dark:bg-background" />
    </PublicLayout>
  );
}
