import { motion } from "framer-motion";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, Link2, DollarSign, ShieldX, Users, FileText, 
  Scale, Building2, Mail, MapPin, AlertCircle, RefreshCw
} from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

export default function AffiliateDisclosurePage() {
  useDocumentMeta({
    title: "Affiliate Disclosure | TRAVI World",
    description: "Learn how TRAVI World earns revenue through affiliate partnerships and our complete disclaimer of liability.",
  });

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <SubtleSkyBackground />
      <PublicNav variant="transparent" />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 rounded-full bg-[#6443F4]/10 flex items-center justify-center mx-auto mb-6">
              <Link2 className="w-8 h-8 text-[#6443F4]" />
            </div>
            <h1 
              className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              data-testid="heading-affiliate-disclosure"
            >
              Affiliate Disclosure
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Effective Date: 1 January 2026
            </p>
          </motion.div>

          <motion.div 
            className="space-y-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800" data-testid="section-about-disclosure">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    <FileText className="w-5 h-5 text-[#6443F4]" />
                    1. About This Disclosure
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-600 dark:text-slate-400 space-y-4">
                  <p>
                    This Affiliate Disclosure explains how https://travi.world ("TRAVI World", "Website", "we", "us") 
                    earns revenue through affiliate partnerships. This disclosure is provided in compliance with the 
                    U.S. Federal Trade Commission (FTC) guidelines, the EU Digital Services Act, and other applicable 
                    advertising disclosure regulations.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800" data-testid="section-what-we-are">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    <Building2 className="w-5 h-5 text-[#6443F4]" />
                    2. What We Are
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-600 dark:text-slate-400 space-y-4">
                  <p>
                    TRAVI World is a travel contents and information platform. We provide travel guides, destination 
                    information, hotel reviews, attraction details, and curated links to third-party travel service providers.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="font-semibold text-amber-800 dark:text-amber-200 mb-2">We are NOT:</p>
                    <ul className="list-disc pl-6 space-y-1 text-amber-700 dark:text-amber-300">
                      <li>A travel agency</li>
                      <li>A tour operator</li>
                      <li>A booking platform</li>
                      <li>A payment processor</li>
                      <li>A hotel, airline, or service provider</li>
                      <li>A party to any transaction you make with third parties</li>
                    </ul>
                  </div>
                  <p>
                    We function solely as an information resource and referral service. We connect you with 
                    third-party providers through affiliate links. Nothing more.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800" data-testid="section-how-we-earn">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    <DollarSign className="w-5 h-5 text-[#6443F4]" />
                    3. How We Earn Money
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-600 dark:text-slate-400 space-y-4">
                  <p>TRAVI World participates in affiliate marketing programs. This means:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>When you click certain links on our Website, you are redirected to a third-party website</li>
                    <li>If you make a purchase or booking on that third-party website, we may earn a commission</li>
                    <li>This commission comes from the third-party provider, NOT from you</li>
                    <li>You pay the same price whether you use our link or go directly to the provider</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800" data-testid="section-affiliate-partners">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    <Users className="w-5 h-5 text-[#6443F4]" />
                    4. Our Affiliate Partners
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-600 dark:text-slate-400 space-y-4">
                  <p>We have affiliate relationships with various travel service providers, which may include but are not limited to:</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                      <h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>Accommodation</h4>
                      <p className="text-sm">Booking.com, Expedia, Hotels.com, Agoda, Hostelworld, Airbnb, Vrbo</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                      <h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>Tours & Activities</h4>
                      <p className="text-sm">GetYourGuide, Viator, Klook, Tiqets, TripAdvisor Experiences</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                      <h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>Flights & Transportation</h4>
                      <p className="text-sm">Skyscanner, Kayak, Kiwi.com, Rome2Rio, 12Go Asia</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                      <h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>Other Services</h4>
                      <p className="text-sm">Travel insurance, car rentals, airport transfers, travel gear</p>
                    </div>
                  </div>
                  
                  <p className="text-sm italic">
                    This list may change. New partners may be added and existing partnerships may end at any time.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-red-200 dark:border-red-800/50" data-testid="section-disclaimer">
                <CardHeader className="bg-red-50/50 dark:bg-red-950/20 rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-lg text-red-800 dark:text-red-200" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    <ShieldX className="w-5 h-5" />
                    5. Complete Disclaimer of Liability
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-600 dark:text-slate-400 space-y-6 pt-6">
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="font-bold text-red-800 dark:text-red-200 text-center">
                      THIS IS IMPORTANT. PLEASE READ CAREFULLY.
                    </p>
                  </div>

                  <p className="font-semibold text-slate-900 dark:text-slate-100">TRAVI World bears absolutely no responsibility or liability for:</p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>5.1 Third-Party Services and Products</h4>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>The quality, safety, legality, or suitability of any service, product, accommodation, tour, flight, or experience offered by third-party providers</li>
                        <li>The accuracy of descriptions, photos, ratings, or reviews displayed on third-party websites</li>
                        <li>The availability or non-availability of any service or product</li>
                        <li>Any changes, modifications, or cancellations made by third-party providers</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>5.2 Pricing and Payments</h4>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Prices displayed on our Website or on third-party websites (prices may change at any time)</li>
                        <li>Currency conversions or exchange rate fluctuations</li>
                        <li>Additional fees, taxes, or charges applied by third-party providers</li>
                        <li>Payment processing, refunds, chargebacks, or billing disputes</li>
                        <li>Any financial loss arising from transactions with third parties</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>5.3 Bookings and Reservations</h4>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Confirmation, modification, or cancellation of bookings</li>
                        <li>Overbookings or denied services</li>
                        <li>No-shows, late arrivals, or early departures</li>
                        <li>Refund policies or lack thereof</li>
                        <li>Any disputes between you and the third-party provider</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>5.4 Travel Experience</h4>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Personal injury, illness, death, or property damage during travel</li>
                        <li>Delays, cancellations, or disruptions caused by weather, strikes, pandemics, or other events</li>
                        <li>Lost, stolen, or damaged luggage or belongings</li>
                        <li>Visa, passport, or entry requirement issues</li>
                        <li>Health and safety conditions at destinations</li>
                        <li>Any dissatisfaction with your travel experience</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>5.5 Information Accuracy</h4>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Accuracy, completeness, or timeliness of information on our Website</li>
                        <li>Errors or omissions in our contents (including AI-generated contents)</li>
                        <li>Outdated information about destinations, services, or providers</li>
                        <li>Reliance on any information provided on our Website</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800" data-testid="section-your-responsibilities">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    <AlertTriangle className="w-5 h-5 text-[#6443F4]" />
                    6. Your Responsibilities
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-600 dark:text-slate-400 space-y-4">
                  <p>By using our Website and clicking affiliate links, you acknowledge and agree that:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>You are solely responsible for verifying all information before making any booking or purchase</li>
                    <li>You must read and understand the terms and conditions of any third-party provider before transacting with them</li>
                    <li>You are responsible for ensuring you meet all travel requirements (visas, vaccinations, insurance, etc.)</li>
                    <li>Any contract or agreement is between you and the third-party provider only — TRAVI World is not a party to such agreements</li>
                    <li>You must direct all questions, complaints, refund requests, or disputes to the third-party provider directly</li>
                    <li>We strongly recommend purchasing comprehensive travel insurance for all trips</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800" data-testid="section-no-endorsement">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    <AlertCircle className="w-5 h-5 text-[#6443F4]" />
                    7. No Endorsement
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-600 dark:text-slate-400 space-y-4">
                  <p>
                    The inclusion of any third-party provider, service, or product on our Website does not constitute 
                    an endorsement, recommendation, or guarantee by TRAVI World. We do not:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Verify the credentials, licenses, or qualifications of third-party providers</li>
                    <li>Inspect or audit hotels, tours, or other services</li>
                    <li>Guarantee the accuracy of ratings or reviews</li>
                    <li>Assume any responsibility for the actions or omissions of third parties</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800" data-testid="section-editorial-independence">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    <FileText className="w-5 h-5 text-[#6443F4]" />
                    8. Editorial Independence
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-600 dark:text-slate-400 space-y-4">
                  <p>
                    While we earn commissions from affiliate links, our contents is created to provide useful 
                    information to travelers. However, you should be aware that:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Financial relationships may influence which providers are featured</li>
                    <li>We may prioritize partners who offer higher commissions</li>
                    <li>Content may be generated automatically by AI systems</li>
                    <li>We encourage you to compare options across multiple sources before making decisions</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800" data-testid="section-third-party-terms">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    <Link2 className="w-5 h-5 text-[#6443F4]" />
                    9. Third-Party Terms Apply
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-600 dark:text-slate-400 space-y-4">
                  <p>When you leave our Website via an affiliate link:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>You are subject to the third party's terms of service, privacy policy, and other applicable policies</li>
                    <li>We have no control over third-party websites, their contents, or their practices</li>
                    <li>We are not responsible for the privacy practices of third parties</li>
                    <li>You should review all applicable policies before transacting</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800" data-testid="section-limitation-liability">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    <Scale className="w-5 h-5 text-[#6443F4]" />
                    10. Limitation of Liability
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-600 dark:text-slate-400 space-y-4">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-sm uppercase">
                    <p>
                      TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRAVI WORLD, KBR GLOBAL CREATIVE CONSULTING LTD, 
                      AND THEIR DIRECTORS, OFFICERS, EMPLOYEES, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY DIRECT, 
                      INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM:
                    </p>
                  </div>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Your use of affiliate links</li>
                    <li>Transactions with third-party providers</li>
                    <li>Reliance on information provided on our Website</li>
                    <li>Any travel-related incidents or experiences</li>
                    <li>Any other matter relating to affiliate relationships or third-party services</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800" data-testid="section-changes">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    <RefreshCw className="w-5 h-5 text-[#6443F4]" />
                    11. Changes to This Disclosure
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-600 dark:text-slate-400">
                  <p>
                    We may update this Affiliate Disclosure at any time. Changes become effective immediately 
                    upon posting. Your continued use of the Website after any changes constitutes acceptance 
                    of the updated disclosure.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800" data-testid="section-contact">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    <Mail className="w-5 h-5 text-[#6443F4]" />
                    12. Contact Us
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-600 dark:text-slate-400 space-y-4">
                  <p>If you have questions about our affiliate relationships, please contact us:</p>
                  
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-[#6443F4]" />
                      <span>Email: </span>
                      <a href="mailto:info@travi.world" className="text-[#6443F4] hover:underline">
                        info@travi.world
                      </a>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-[#6443F4] mt-1" />
                      <span>
                        Postal Address: KBR Global Creative Consulting Ltd, Suite 4.3.02, Block 4, Eurotowers, 
                        Gibraltar GX11 1AA, Gibraltar
                      </span>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-amber-800 dark:text-amber-200 font-medium">
                      REMEMBER: For any issues with bookings, payments, refunds, cancellations, or service quality, 
                      contact the third-party provider directly. TRAVI World cannot assist with these matters as 
                      we are not a party to your transaction.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          <motion.div 
            className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <p>© 2026 TRAVI World. All rights reserved.</p>
            <p className="mt-1">Operated by KBR Global Creative Consulting Ltd, Gibraltar (Company No. 125571)</p>
          </motion.div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
