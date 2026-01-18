import { DubaiPillarTemplate } from "./templates/DubaiPillarTemplate";
import { getDubaiPageBySlug } from "@/data/dubai-pages";
import { 
  Shield, 
  Building2, 
  FileText, 
  Landmark,
  Scale,
  Lock,
  Users,
  BadgeCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const pageData = getDubaiPageBySlug("legal-security-guide");

export default function PillarLegalSecurity() {
  if (!pageData) return null;

  return (
    <DubaiPillarTemplate
      title={pageData.title}
      metaDescription={pageData.description}
      canonicalPath="/destinations/dubai/legal-security-guide"
      keywords={pageData.keywords}
      breadcrumbs={pageData.breadcrumbs}
      hero={{
        title: pageData.hero.title,
        subtitle: pageData.hero.subtitle,
        backgroundImage: pageData.hero.image,
        badges: pageData.hero.badges?.map(text => ({ text })),
        stats: pageData.stats,
      }}
      introStats={[
        { value: "RERA", label: "Regulated Market", subtext: "Government oversight" },
        { value: "100%", label: "Freehold Ownership", subtext: "For foreigners" },
        { value: "Escrow", label: "Fund Protection", subtext: "Off-plan security" },
        { value: "10 Years", label: "Golden Visa", subtext: "Property route" },
      ]}
      introStatsTitle="Your Rights in Dubai Real Estate"
      tableOfContents={[
        { id: "rera-explained", title: "RERA & Regulatory Framework", icon: Shield },
        { id: "ownership-rights", title: "Ownership Rights for Foreigners", icon: Building2 },
        { id: "escrow-protection", title: "Escrow Account Protection", icon: Lock },
        { id: "title-deeds", title: "Title Deeds & Registration", icon: FileText },
        { id: "golden-visa", title: "Golden Visa Through Property", icon: BadgeCheck },
        { id: "dispute-resolution", title: "Dispute Resolution", icon: Scale },
      ]}
      tocTitle="What You'll Learn"
      sections={[
        {
          id: "rera-explained",
          title: "RERA & Regulatory Framework",
          icon: Shield,
          content: (
            <div className="space-y-6">
              <p>
                Dubai's Real Estate Regulatory Agency (RERA) operates under the Dubai Land Department (DLD) 
                to ensure transparency, protect buyers, and regulate the property market. Understanding RERA 
                is essential for any property transaction in Dubai.
              </p>

              <h4 className="font-semibold text-lg">What RERA Regulates</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-3">Developer Oversight</h5>
                    <ul className="space-y-2 text-sm">
                      <li>• Licensing of all property developers</li>
                      <li>• Project registration requirements</li>
                      <li>• Construction milestone monitoring</li>
                      <li>• Escrow account management</li>
                      <li>• Advertisement approvals</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-3">Agent & Broker Regulation</h5>
                    <ul className="space-y-2 text-sm">
                      <li>• Mandatory broker registration (BRN)</li>
                      <li>• Commission caps (typically 2%)</li>
                      <li>• Training and certification requirements</li>
                      <li>• Complaint handling procedures</li>
                      <li>• Annual license renewals</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <h4 className="font-semibold text-lg">Key RERA Protections</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Project Registration:</strong> All off-plan projects must be registered with RERA before sales can begin</li>
                <li><strong>Escrow Accounts:</strong> Developer funds held in protected escrow accounts</li>
                <li><strong>SPA Approval:</strong> Standard Sale and Purchase Agreement templates protect buyers</li>
                <li><strong>Completion Guarantees:</strong> Mechanisms to ensure project completion even if developer faces issues</li>
                <li><strong>Transparency:</strong> Developers must disclose project details, timelines, and specifications</li>
              </ul>

              <h4 className="font-semibold text-lg mt-6">How to Verify RERA Registration</h4>
              <p>
                Before purchasing any property, verify these registrations:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Developer License:</strong> Check on Dubai REST app or DLD website</li>
                <li><strong>Project Registration:</strong> Every off-plan project has a RERA number</li>
                <li><strong>Broker Registration Number (BRN):</strong> All agents must display their BRN</li>
                <li><strong>Agency License:</strong> Real estate companies must be DLD-registered</li>
              </ul>
            </div>
          ),
          stats: [
            { value: "DLD", label: "Dubai Land Department", subtext: "Parent authority" },
            { value: "2007", label: "RERA Established", subtext: "17+ years experience" },
            { value: "50+", label: "Laws & Regulations", subtext: "Protecting buyers" },
          ],
        },
        {
          id: "ownership-rights",
          title: "Ownership Rights for Foreigners",
          icon: Building2,
          content: (
            <div className="space-y-6">
              <p>
                Dubai is one of the world's most accessible property markets for foreign investors. 
                Since 2002, non-UAE nationals can own freehold property in designated areas with full 
                ownership rights similar to local citizens.
              </p>

              <h4 className="font-semibold text-lg">Types of Property Ownership</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-2 text-green-600">Freehold</h5>
                    <p className="text-sm text-muted-foreground mb-3">
                      Full ownership of property and land
                    </p>
                    <ul className="space-y-1 text-sm">
                      <li>• 100% ownership rights</li>
                      <li>• Inheritable to heirs</li>
                      <li>• No time limit</li>
                      <li>• Can sell or lease freely</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-2 text-blue-600">Leasehold</h5>
                    <p className="text-sm text-muted-foreground mb-3">
                      Long-term lease arrangement
                    </p>
                    <ul className="space-y-1 text-sm">
                      <li>• Typically 99 years</li>
                      <li>• Full usage rights</li>
                      <li>• Renewable terms</li>
                      <li>• Land reverts to owner</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-2 text-amber-600">Usufruct</h5>
                    <p className="text-sm text-muted-foreground mb-3">
                      Right to use and benefit
                    </p>
                    <ul className="space-y-1 text-sm">
                      <li>• Limited term (usually 50 years)</li>
                      <li>• Usage and rental rights</li>
                      <li>• Cannot modify structure</li>
                      <li>• Less common in Dubai</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <h4 className="font-semibold text-lg mt-6">Freehold Areas for Foreign Ownership</h4>
              <p>
                Major freehold areas include (but are not limited to):
              </p>
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4 text-sm">
                <div className="bg-muted/30 p-2 rounded">Downtown Dubai</div>
                <div className="bg-muted/30 p-2 rounded">Dubai Marina</div>
                <div className="bg-muted/30 p-2 rounded">Palm Jumeirah</div>
                <div className="bg-muted/30 p-2 rounded">Business Bay</div>
                <div className="bg-muted/30 p-2 rounded">JBR</div>
                <div className="bg-muted/30 p-2 rounded">JVC</div>
                <div className="bg-muted/30 p-2 rounded">Dubai Hills</div>
                <div className="bg-muted/30 p-2 rounded">Arabian Ranches</div>
                <div className="bg-muted/30 p-2 rounded">Emirates Living</div>
                <div className="bg-muted/30 p-2 rounded">Dubai South</div>
                <div className="bg-muted/30 p-2 rounded">Creek Harbour</div>
                <div className="bg-muted/30 p-2 rounded">DIFC</div>
              </div>

              <h4 className="font-semibold text-lg mt-6">What You Can Do With Your Property</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Live In:</strong> Use as primary residence or holiday home</li>
                <li><strong>Rent Out:</strong> Long-term (Ejari) or short-term (DTCM licensed)</li>
                <li><strong>Sell:</strong> Sell at any time to any nationality</li>
                <li><strong>Mortgage:</strong> Finance through UAE banks (up to 75% LTV)</li>
                <li><strong>Inherit:</strong> Pass to heirs according to your home country laws (with registered will)</li>
              </ul>
            </div>
          ),
        },
        {
          id: "escrow-protection",
          title: "Escrow Account Protection",
          icon: Lock,
          content: (
            <div className="space-y-6">
              <p>
                Dubai's escrow system is one of the strongest buyer protections in global real estate. 
                All off-plan property payments are held in regulated escrow accounts, ensuring funds 
                are only released when construction milestones are achieved.
              </p>

              <h4 className="font-semibold text-lg">How Escrow Works</h4>
              <div className="bg-primary/5 p-4 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
                  <div>
                    <strong>Account Opening:</strong> Developer opens escrow account with approved bank before sales
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
                  <div>
                    <strong>Payment Collection:</strong> All buyer payments deposited into escrow (not developer's account)
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
                  <div>
                    <strong>Milestone Release:</strong> RERA approves fund release only when construction stages complete
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div>
                  <div>
                    <strong>Project Completion:</strong> Final funds released upon obtaining completion certificate
                  </div>
                </div>
              </div>

              <h4 className="font-semibold text-lg">Escrow Law Protections</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Segregated Funds:</strong> Developer cannot use escrow funds for other projects</li>
                <li><strong>Independent Monitoring:</strong> RERA oversees all escrow transactions</li>
                <li><strong>Milestone Verification:</strong> Engineering consultants verify construction before fund release</li>
                <li><strong>Bankruptcy Protection:</strong> Escrow funds protected if developer faces financial issues</li>
                <li><strong>Refund Mechanism:</strong> Clear procedures for refunds if project cancelled</li>
              </ul>

              <h4 className="font-semibold text-lg mt-6">What If a Developer Fails?</h4>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm mb-4">
                    If a developer cannot complete a project, RERA has several mechanisms:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li><strong>1. New Developer:</strong> RERA can appoint another developer to complete the project</li>
                    <li><strong>2. Buyer Refund:</strong> If completion impossible, buyers receive refunds from escrow</li>
                    <li><strong>3. Project Restructuring:</strong> RERA may restructure project scope or timeline</li>
                    <li><strong>4. Legal Proceedings:</strong> Buyers can pursue claims through Rental Dispute Centre</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          ),
          stats: [
            { value: "100%", label: "Funds Protected", subtext: "In escrow" },
            { value: "2007", label: "Law Introduced", subtext: "Escrow Law #8" },
            { value: "Bank-Held", label: "Accounts", subtext: "Not with developer" },
          ],
        },
        {
          id: "title-deeds",
          title: "Title Deeds & Registration",
          icon: FileText,
          content: (
            <div className="space-y-6">
              <p>
                Dubai's title deed system is fully digital and provides clear proof of property ownership. 
                All property transactions are registered with the Dubai Land Department, which issues 
                official title deeds.
              </p>

              <h4 className="font-semibold text-lg">Registration Process</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-3">Off-Plan Purchase</h5>
                    <ol className="space-y-2 text-sm list-decimal pl-4">
                      <li>Sign SPA with developer</li>
                      <li>Register with DLD (Oqood for off-plan)</li>
                      <li>Receive interim registration certificate</li>
                      <li>Upon completion, receive Title Deed</li>
                    </ol>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-3">Secondary Market</h5>
                    <ol className="space-y-2 text-sm list-decimal pl-4">
                      <li>Sign MOU with seller (Form F)</li>
                      <li>Obtain NOC from developer</li>
                      <li>Transfer at DLD trustee office</li>
                      <li>Receive Title Deed same day</li>
                    </ol>
                  </CardContent>
                </Card>
              </div>

              <h4 className="font-semibold text-lg">Registration Fees & Costs</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">Fee Type</th>
                      <th className="text-left py-2 pr-4">Amount</th>
                      <th className="text-left py-2">Paid By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="py-2 pr-4">DLD Transfer Fee</td><td className="py-2 pr-4">4% of property value</td><td className="py-2">Buyer (usually)</td></tr>
                    <tr><td className="py-2 pr-4">Registration Fee</td><td className="py-2 pr-4">AED 2,000 - 4,000</td><td className="py-2">Buyer</td></tr>
                    <tr><td className="py-2 pr-4">NOC Fee</td><td className="py-2 pr-4">AED 500 - 5,000</td><td className="py-2">Seller</td></tr>
                    <tr><td className="py-2 pr-4">Trustee Fee</td><td className="py-2 pr-4">AED 4,000 + VAT</td><td className="py-2">Buyer</td></tr>
                    <tr><td className="py-2 pr-4">Agent Commission</td><td className="py-2 pr-4">2% of property value</td><td className="py-2">Seller (negotiable)</td></tr>
                  </tbody>
                </table>
              </div>

              <h4 className="font-semibold text-lg mt-6">Title Deed Verification</h4>
              <p>
                You can verify any title deed through:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Dubai REST App:</strong> Official DLD app for title deed verification</li>
                <li><strong>DLD Website:</strong> Online verification portal</li>
                <li><strong>Ejari System:</strong> Shows registered tenancy contracts</li>
                <li><strong>DLD Service Centers:</strong> In-person verification</li>
              </ul>
            </div>
          ),
        },
        {
          id: "golden-visa",
          title: "Golden Visa Through Property",
          icon: BadgeCheck,
          content: (
            <div className="space-y-6">
              <p>
                The UAE Golden Visa program offers 10-year renewable residency to property investors. 
                This long-term visa provides stability for investors and their families to live, work, 
                and study in the UAE.
              </p>

              <h4 className="font-semibold text-lg">Property Investment Requirements</h4>
              <Card>
                <CardContent className="p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h5 className="font-semibold mb-3">10-Year Golden Visa</h5>
                      <ul className="space-y-2 text-sm">
                        <li>• Property value: AED 2 million minimum</li>
                        <li>• Must be completed property (not off-plan)</li>
                        <li>• Can be one or multiple properties</li>
                        <li>• Property must be retained for visa duration</li>
                        <li>• Mortgage allowed (if equity exceeds AED 2M)</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-semibold mb-3">Benefits Include</h5>
                      <ul className="space-y-2 text-sm">
                        <li>• 10-year renewable visa</li>
                        <li>• Sponsor spouse and children (any age)</li>
                        <li>• Sponsor domestic helpers</li>
                        <li>• No minimum stay requirement</li>
                        <li>• Work without separate permit</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <h4 className="font-semibold text-lg">Application Process</h4>
              <div className="bg-primary/5 p-4 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
                  <div>
                    <strong>Property Purchase:</strong> Buy property worth AED 2M+ and obtain title deed
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
                  <div>
                    <strong>Valuation Letter:</strong> Obtain property valuation from DLD-approved valuer
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
                  <div>
                    <strong>Apply Online:</strong> Submit application through ICP or GDRFA portal
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div>
                  <div>
                    <strong>Medical & Emirates ID:</strong> Complete health check and biometrics
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">5</div>
                  <div>
                    <strong>Visa Issuance:</strong> Receive 10-year visa (typically 2-4 weeks total)
                  </div>
                </div>
              </div>

              <h4 className="font-semibold text-lg mt-6">Required Documents</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Valid passport (6+ months validity)</li>
                <li>Title deed from Dubai Land Department</li>
                <li>Property valuation letter</li>
                <li>Passport-size photos (white background)</li>
                <li>Health insurance (UAE-valid)</li>
                <li>No Objection Certificate (if sponsored elsewhere)</li>
              </ul>
            </div>
          ),
          stats: [
            { value: "AED 2M", label: "Minimum Investment", subtext: "Property value" },
            { value: "10 Years", label: "Visa Duration", subtext: "Renewable" },
            { value: "2-4 Weeks", label: "Processing Time", subtext: "Typical duration" },
          ],
        },
        {
          id: "dispute-resolution",
          title: "Dispute Resolution",
          icon: Scale,
          content: (
            <div className="space-y-6">
              <p>
                Dubai has established robust mechanisms for resolving property disputes. Whether you're 
                dealing with a developer delay, tenant issue, or transaction dispute, there are clear 
                pathways to resolution.
              </p>

              <h4 className="font-semibold text-lg">Dispute Resolution Bodies</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Rental Dispute Settlement Centre
                    </h5>
                    <p className="text-sm text-muted-foreground mb-3">For landlord-tenant disputes</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Rent increases disputes</li>
                      <li>• Eviction cases</li>
                      <li>• Security deposit conflicts</li>
                      <li>• Maintenance disputes</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-2 flex items-center gap-2">
                      <Landmark className="w-4 h-4" />
                      Special Tribunal for Disputed Developments
                    </h5>
                    <p className="text-sm text-muted-foreground mb-3">For off-plan and developer disputes</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Project delays</li>
                      <li>• Specification changes</li>
                      <li>• Cancellation claims</li>
                      <li>• Refund disputes</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <h4 className="font-semibold text-lg">Common Disputes & Remedies</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">Issue</th>
                      <th className="text-left py-2 pr-4">Resolution Body</th>
                      <th className="text-left py-2">Typical Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="py-2 pr-4">Project delay</td><td className="py-2 pr-4">RERA / Special Tribunal</td><td className="py-2">Extension or refund</td></tr>
                    <tr><td className="py-2 pr-4">Tenant not paying</td><td className="py-2 pr-4">Rental Dispute Centre</td><td className="py-2">Eviction order</td></tr>
                    <tr><td className="py-2 pr-4">Illegal rent increase</td><td className="py-2 pr-4">Rental Dispute Centre</td><td className="py-2">Rent reversal</td></tr>
                    <tr><td className="py-2 pr-4">Developer bankruptcy</td><td className="py-2 pr-4">Special Tribunal</td><td className="py-2">Escrow refund</td></tr>
                    <tr><td className="py-2 pr-4">Agent fraud</td><td className="py-2 pr-4">RERA + Police</td><td className="py-2">License revocation + prosecution</td></tr>
                  </tbody>
                </table>
              </div>

              <h4 className="font-semibold text-lg mt-6">Filing a Complaint</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Online:</strong> File through Dubai REST app or DLD website</li>
                <li><strong>In Person:</strong> Visit DLD service centers</li>
                <li><strong>Hotline:</strong> Call 800 4488 for guidance</li>
                <li><strong>Legal Representation:</strong> Not required but recommended for complex cases</li>
              </ul>

              <Card className="mt-4">
                <CardContent className="p-5">
                  <h5 className="font-semibold mb-2">Pro Tip: Prevention is Best</h5>
                  <p className="text-sm text-muted-foreground">
                    Most disputes can be avoided by thorough due diligence: verify RERA registration, 
                    read SPAs carefully, use registered agents, and document all communications. 
                    When issues arise, address them early through official channels.
                  </p>
                </CardContent>
              </Card>
            </div>
          ),
        },
      ]}
      faqs={[
        ...(pageData.faqs || []),
        {
          question: "Do I need a lawyer to buy property in Dubai?",
          answer: "While not legally required, having a lawyer review your SPA is recommended, especially for large purchases or complex transactions. Many buyers successfully complete transactions using only RERA-registered agents and DLD trustee services.",
        },
        {
          question: "What happens if I don't receive my property on time?",
          answer: "Dubai law allows buyers to cancel and receive refunds if projects are delayed significantly (typically beyond 1 year of agreed handover). Contact RERA first; they mediate between buyers and developers. If unresolved, the Special Tribunal handles escalated cases.",
        },
        {
          question: "Can I leave my property to my heirs?",
          answer: "Yes, but you should register a will with DIFC Wills Service Centre or Dubai Courts. Without a registered will, Sharia law may apply to your estate. A registered will ensures your property passes according to your wishes.",
        },
        {
          question: "Is my property secure if I'm not in Dubai?",
          answer: "Yes, Dubai's legal system fully protects foreign owners regardless of residency. Your title deed remains valid, rental income is protected by law, and property management companies can handle your investment remotely.",
        },
      ]}
      faqTitle="Legal & Security FAQ"
      cta={{
        title: "Invest With Confidence",
        description: "Now that you understand your legal protections, explore investment opportunities in Dubai's regulated market.",
        primaryButton: {
          label: pageData.cta?.label || "View Investment Guide",
          href: pageData.cta?.href || "/destinations/dubai/off-plan/investment-guide",
        },
        secondaryButton: {
          label: "Explore Districts",
          href: "/destinations/dubai/districts",
        },
      }}
    />
  );
}
