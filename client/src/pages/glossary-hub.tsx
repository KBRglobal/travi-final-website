import { Link } from "wouter";
import { BookOpen, ChevronRight, Search, Building, FileText, Shield, DollarSign, Home, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { 
  OffPlanStatsBar, 
  OffPlanBreadcrumb, 
  OffPlanSubNav, 
  OffPlanCTASection, 
  RelatedLinks,
  TrustSignals 
} from "@/components/off-plan-shared";
import { useDocumentMeta } from "@/hooks/use-document-meta";

const glossaryTerms = [
  { term: "DLD", fullName: "Dubai Land Department", category: "Government", description: "Government authority responsible for regulating real estate in Dubai, registering property ownership, and issuing title deeds." },
  { term: "RERA", fullName: "Real Estate Regulatory Agency", category: "Government", description: "Regulatory body under DLD that oversees real estate activities, protects buyers, and licenses developers and brokers." },
  { term: "Oqood", fullName: "Off-Plan Sales Agreement", category: "Legal", description: "Registration certificate for off-plan property purchases, issued before the title deed and proving buyer ownership during construction." },
  { term: "Escrow Account", fullName: "Protected Payment Account", category: "Financial", description: "Regulated bank account where buyer payments are held securely, released to developers only upon construction milestone completion." },
  { term: "Title Deed", fullName: "Property Ownership Document", category: "Legal", description: "Official document proving ownership of completed property, issued by DLD and required for selling or mortgaging the property." },
  { term: "Freehold", fullName: "Full Ownership Rights", category: "Ownership", description: "Type of property ownership where the buyer has complete rights over the property and land forever, available to foreigners in designated areas." },
  { term: "Leasehold", fullName: "Long-Term Lease Rights", category: "Ownership", description: "Property ownership for a fixed term (typically 99 years), after which rights revert to the freeholder." },
  { term: "Golden Visa", fullName: "10-Year UAE Residency", category: "Visa", description: "Long-term UAE residency visa for property investors with AED 2M+ investment, allowing 10-year stay with family sponsorship rights." },
  { term: "VARA", fullName: "Virtual Assets Regulatory Authority", category: "Government", description: "Dubai's regulator for cryptocurrency and virtual assets, overseeing crypto payments for property transactions." },
  { term: "SPA", fullName: "Sale and Purchase Agreement", category: "Legal", description: "Legal contract between buyer and developer outlining property details, payment terms, handover date, and buyer/seller obligations." },
  { term: "NOC", fullName: "No Objection Certificate", category: "Legal", description: "Certificate from the developer confirming all dues are paid, required for property resale or transfer." },
  { term: "Service Charge", fullName: "Building Maintenance Fee", category: "Financial", description: "Annual fee paid by owners for building maintenance, common areas, security, and amenities, calculated per square foot." },
  { term: "Snagging", fullName: "Property Inspection", category: "Process", description: "Inspection process before handover to identify defects, incomplete work, or deviations from specifications for developer correction." },
  { term: "Handover", fullName: "Property Delivery", category: "Process", description: "Date when the completed property is delivered to the buyer, keys are handed over, and final payments are made." },
  { term: "Post-Handover", fullName: "Payments After Delivery", category: "Payment", description: "Payment plan structure where portion of purchase price (20-50%) is paid after receiving keys, spread over 2-5 years." },
  { term: "LTV", fullName: "Loan-to-Value Ratio", category: "Financial", description: "Percentage of property value that a bank will finance through mortgage, typically 75-80% for off-plan properties in Dubai." },
  { term: "ROI", fullName: "Return on Investment", category: "Financial", description: "Measure of investment profit expressed as percentage, combining rental income and capital appreciation." },
  { term: "Yield", fullName: "Rental Yield", category: "Financial", description: "Annual rental income as percentage of property value, typically 5-9% in Dubai depending on location." },
  { term: "Ejari", fullName: "Tenancy Registration", category: "Legal", description: "Online system for registering rental contracts in Dubai, mandatory for all tenancies and required for utilities connection." },
  { term: "AED", fullName: "UAE Dirham", category: "Financial", description: "Official currency of the United Arab Emirates, pegged to US Dollar at rate of 3.67 AED per 1 USD." },
  { term: "DED", fullName: "Department of Economic Development", category: "Government", description: "Government body issuing business licenses in Dubai, relevant for property management and brokerage activities." },
  { term: "DEWA", fullName: "Dubai Electricity and Water Authority", category: "Utilities", description: "Provider of electricity and water services in Dubai, connection required after property handover." },
  { term: "Usufruct", fullName: "Right to Use Property", category: "Ownership", description: "Right to use and benefit from property for specified period without full ownership, common in certain areas." },
  { term: "Off-Plan", fullName: "Pre-Construction Property", category: "Property Type", description: "Property purchased before or during construction, typically at lower prices with flexible payment plans." },
  { term: "Ready Property", fullName: "Completed Property", category: "Property Type", description: "Property that is fully constructed and available for immediate occupancy or rental." }
];

const categories = [
  { name: "Government", icon: Building, count: 4 },
  { name: "Legal", icon: FileText, count: 5 },
  { name: "Financial", icon: DollarSign, count: 6 },
  { name: "Ownership", icon: Home, count: 3 },
  { name: "Process", icon: Shield, count: 2 },
  { name: "Other", icon: Globe, count: 5 }
];

export default function GlossaryHub() {
  const [searchQuery, setSearchQuery] = useState("");

  useDocumentMeta({
    title: "Dubai Real Estate Glossary | A-Z Property Terms Explained 2026",
    description: "Complete Dubai real estate glossary. Learn DLD, RERA, Oqood, escrow, freehold, Golden Visa, and 50+ property terms. Essential guide for Dubai investors.",
    ogType: "website"
  });

  const breadcrumbItems = [
    { label: "Off-Plan", href: "/dubai-off-plan-properties" },
    { label: "Learn", href: "/dubai-off-plan-properties" },
    { label: "Glossary" }
  ];

  const filteredTerms = glossaryTerms.filter(
    item => 
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedTerms = filteredTerms.reduce((acc, term) => {
    const letter = term.term[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(term);
    return acc;
  }, {} as Record<string, typeof glossaryTerms>);

  return (
    <div className="min-h-screen bg-background">
      <OffPlanStatsBar />
      <OffPlanSubNav activeHref="/dubai-off-plan-properties" />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <OffPlanBreadcrumb items={breadcrumbItems} />

        <section className="mb-12">
          <div className="relative overflow-hidden rounded-md bg-[#0B0A1F] p-8 md:p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-[#6443F4]/20 to-[#6443F4]/20" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                  <BookOpen className="h-3 w-3 mr-1" />
                  25+ Terms
                </Badge>
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                  A-Z Guide
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                Dubai Real Estate Glossary
              </h1>
              <p className="text-lg md:text-xl text-white/80 mb-6 max-w-3xl">
                Master the language of Dubai real estate. From DLD to Golden Visa, 
                understand every term you'll encounter in your property investment journey.
              </p>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  placeholder="Search terms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
                  data-testid="input-search-glossary"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((category, index) => (
              <Card key={index} className="hover-elevate cursor-pointer">
                <CardContent className="pt-4 text-center">
                  <category.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="font-semibold text-sm">{category.name}</div>
                  <div className="text-xs text-muted-foreground">{category.count} terms</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6">
            {searchQuery ? `Search Results (${filteredTerms.length})` : 'All Terms A-Z'}
          </h2>
          
          {Object.keys(groupedTerms).sort().map(letter => (
            <div key={letter} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  {letter}
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {groupedTerms[letter].map((item, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="font-bold text-primary">{item.term}</span>
                          <span className="text-muted-foreground"> - {item.fullName}</span>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">{item.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {filteredTerms.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No terms found</h3>
                <p className="text-muted-foreground">Try a different search term</p>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6">Most Important Terms for Investors</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Escrow Account</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Your funds are protected in a regulated bank account. Developers can only 
                  access money when construction milestones are verified.
                </p>
                <Badge>Buyer Protection</Badge>
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Oqood</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Your proof of ownership during construction. This certificate is registered 
                  with DLD and converts to a title deed at handover.
                </p>
                <Badge>Ownership Proof</Badge>
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Golden Visa</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Invest AED 2M+ in property and qualify for 10-year UAE residency. 
                  Sponsor family members and work freely in the UAE.
                </p>
                <Badge>Residency Benefit</Badge>
              </CardContent>
            </Card>
          </div>
        </section>

        <OffPlanCTASection
          title="Have Questions About Any Term?"
          subtitle="Our consultants can explain any real estate concept and guide you through the Dubai property buying process."
          ctaText="Get Expert Help"
          onCtaClick={() => {}}
        />

        <RelatedLinks
          title="Related Learning Resources"
          links={[
            { href: "/dubai-off-plan-investment-guide", title: "Investment Guide" },
            { href: "/how-to-buy-dubai-off-plan", title: "How to Buy" },
            { href: "/off-plan-escrow", title: "Escrow Protection" },
            { href: "/off-plan-golden-visa", title: "Golden Visa Guide" },
            { href: "/dubai-off-plan-payment-plans", title: "Payment Plans" },
            { href: "/tools-roi-calculator", title: "ROI Calculator" }
          ]}
        />

        <TrustSignals />
      </main>
    </div>
  );
}
