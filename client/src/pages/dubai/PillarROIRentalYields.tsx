import { DubaiPillarTemplate } from "./templates/DubaiPillarTemplate";
import { getDubaiPageBySlug } from "@/data/dubai-pages";
import { 
  TrendingUp, 
  MapPin, 
  Calculator, 
  Globe,
  BarChart3,
  Coins,
  Target,
  Shield
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const pageData = getDubaiPageBySlug("roi-rental-yields");

export default function PillarROIRentalYields() {
  if (!pageData) return null;

  return (
    <DubaiPillarTemplate
      title={pageData.title}
      metaDescription={pageData.description}
      canonicalPath="/destinations/dubai/roi-rental-yields"
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
        { value: "7-10%", label: "Average Gross Yield", subtext: "Dubai market average" },
        { value: "5-7%", label: "Net Yield", subtext: "After all expenses" },
        { value: "0%", label: "Rental Income Tax", subtext: "Tax-free returns" },
        { value: "30%+", label: "Capital Appreciation", subtext: "5-year average (select areas)" },
      ]}
      introStatsTitle="Dubai ROI at a Glance"
      tableOfContents={[
        { id: "understanding-yields", title: "Understanding Rental Yields", icon: Calculator },
        { id: "area-analysis", title: "Yields by Area", icon: MapPin },
        { id: "capital-appreciation", title: "Capital Appreciation Trends", icon: TrendingUp },
        { id: "global-comparison", title: "Global Market Comparison", icon: Globe },
        { id: "maximizing-roi", title: "Maximizing Your ROI", icon: Target },
        { id: "risk-factors", title: "Risk Factors & Considerations", icon: Shield },
      ]}
      tocTitle="What You'll Learn"
      sections={[
        {
          id: "understanding-yields",
          title: "Understanding Rental Yields",
          icon: Calculator,
          content: (
            <div className="space-y-6">
              <p>
                Rental yield is the annual return on your property investment expressed as a percentage. 
                In Dubai, yields are typically measured in two ways: gross yield and net yield.
              </p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-2">Gross Rental Yield</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      The basic calculation before expenses:
                    </p>
                    <div className="bg-primary/5 p-3 rounded-md font-mono text-sm">
                      (Annual Rent ÷ Property Price) × 100
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      Example: AED 80,000 rent on AED 1,000,000 property = 8% gross yield
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-2">Net Rental Yield</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      The true return after all expenses:
                    </p>
                    <div className="bg-primary/5 p-3 rounded-md font-mono text-sm">
                      ((Annual Rent - Expenses) ÷ Property Price) × 100
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      Deduct: service charges, maintenance, vacancy (5-8%), management fees
                    </p>
                  </CardContent>
                </Card>
              </div>

              <h4 className="font-semibold text-lg">Typical Expenses to Deduct:</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service Charges:</strong> AED 12-30 per sqft annually depending on building quality</li>
                <li><strong>Maintenance Reserve:</strong> 1-2% of property value annually for repairs</li>
                <li><strong>Vacancy Allowance:</strong> 5-8% (roughly 2-4 weeks between tenants)</li>
                <li><strong>Property Management:</strong> 5-8% of annual rent if using an agency</li>
                <li><strong>Insurance:</strong> AED 1,000-3,000 annually (optional but recommended)</li>
              </ul>
            </div>
          ),
          stats: [
            { value: "2-3%", label: "Yield Difference", subtext: "Gross vs net" },
            { value: "AED 15-25", label: "Avg Service Charge", subtext: "Per sqft annually" },
            { value: "5%", label: "Vacancy Rate", subtext: "Dubai average" },
          ],
        },
        {
          id: "area-analysis",
          title: "Rental Yields by Area",
          icon: MapPin,
          content: (
            <div className="space-y-6">
              <p>
                Dubai's property market offers varying yields depending on location, property type, and target tenant demographic. 
                Here's a comprehensive breakdown by area:
              </p>

              <h4 className="font-semibold text-lg">High Yield Areas (8-10%+)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">Area</th>
                      <th className="text-left py-2 pr-4">Gross Yield</th>
                      <th className="text-left py-2 pr-4">Property Type</th>
                      <th className="text-left py-2">Avg Price (1BR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="py-2 pr-4">JVC</td><td className="py-2 pr-4">8-10%</td><td className="py-2 pr-4">Apartments</td><td className="py-2">AED 600K-800K</td></tr>
                    <tr><td className="py-2 pr-4">International City</td><td className="py-2 pr-4">9-11%</td><td className="py-2 pr-4">Apartments</td><td className="py-2">AED 280K-400K</td></tr>
                    <tr><td className="py-2 pr-4">Dubai South</td><td className="py-2 pr-4">7-9%</td><td className="py-2 pr-4">Apartments</td><td className="py-2">AED 450K-650K</td></tr>
                    <tr><td className="py-2 pr-4">Discovery Gardens</td><td className="py-2 pr-4">8-9%</td><td className="py-2 pr-4">Apartments</td><td className="py-2">AED 300K-450K</td></tr>
                  </tbody>
                </table>
              </div>

              <h4 className="font-semibold text-lg mt-6">Medium Yield Areas (6-8%)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">Area</th>
                      <th className="text-left py-2 pr-4">Gross Yield</th>
                      <th className="text-left py-2 pr-4">Property Type</th>
                      <th className="text-left py-2">Avg Price (1BR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="py-2 pr-4">Business Bay</td><td className="py-2 pr-4">7-8.5%</td><td className="py-2 pr-4">Apartments</td><td className="py-2">AED 900K-1.4M</td></tr>
                    <tr><td className="py-2 pr-4">Dubai Marina</td><td className="py-2 pr-4">6-7.5%</td><td className="py-2 pr-4">Apartments</td><td className="py-2">AED 1.2M-1.8M</td></tr>
                    <tr><td className="py-2 pr-4">JBR</td><td className="py-2 pr-4">6-7%</td><td className="py-2 pr-4">Apartments</td><td className="py-2">AED 1.5M-2.2M</td></tr>
                    <tr><td className="py-2 pr-4">Downtown Dubai</td><td className="py-2 pr-4">5.5-7%</td><td className="py-2 pr-4">Apartments</td><td className="py-2">AED 1.8M-3M</td></tr>
                  </tbody>
                </table>
              </div>

              <h4 className="font-semibold text-lg mt-6">Premium Areas (4-6%)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">Area</th>
                      <th className="text-left py-2 pr-4">Gross Yield</th>
                      <th className="text-left py-2 pr-4">Property Type</th>
                      <th className="text-left py-2">Avg Price (1BR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="py-2 pr-4">Palm Jumeirah</td><td className="py-2 pr-4">4-5.5%</td><td className="py-2 pr-4">Apartments/Villas</td><td className="py-2">AED 2.5M-5M+</td></tr>
                    <tr><td className="py-2 pr-4">Emirates Hills</td><td className="py-2 pr-4">3-4%</td><td className="py-2 pr-4">Villas</td><td className="py-2">AED 15M-50M+</td></tr>
                    <tr><td className="py-2 pr-4">Dubai Hills Villas</td><td className="py-2 pr-4">4-5%</td><td className="py-2 pr-4">Villas</td><td className="py-2">AED 5M-15M</td></tr>
                    <tr><td className="py-2 pr-4">Bluewaters Island</td><td className="py-2 pr-4">4.5-5.5%</td><td className="py-2 pr-4">Apartments</td><td className="py-2">AED 2M-4M</td></tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                Note: Premium areas typically offer lower yields but higher capital appreciation potential and more stable tenant demand.
              </p>
            </div>
          ),
        },
        {
          id: "capital-appreciation",
          title: "Capital Appreciation Trends",
          icon: TrendingUp,
          content: (
            <div className="space-y-6">
              <p>
                Beyond rental yields, capital appreciation is a crucial component of total ROI. Dubai's property market 
                has shown strong appreciation in recent years, with some areas significantly outperforming others.
              </p>

              <h4 className="font-semibold text-lg">Historical Price Appreciation (2020-2025)</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-3">Top Appreciating Areas</h5>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between"><span>Palm Jumeirah</span><span className="font-semibold text-green-600">+65%</span></li>
                      <li className="flex justify-between"><span>Dubai Marina</span><span className="font-semibold text-green-600">+45%</span></li>
                      <li className="flex justify-between"><span>Downtown Dubai</span><span className="font-semibold text-green-600">+40%</span></li>
                      <li className="flex justify-between"><span>Business Bay</span><span className="font-semibold text-green-600">+35%</span></li>
                      <li className="flex justify-between"><span>Dubai Hills</span><span className="font-semibold text-green-600">+50%</span></li>
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-3">Market Drivers</h5>
                    <ul className="space-y-2 text-sm">
                      <li>• Post-COVID economic recovery & migration</li>
                      <li>• Golden Visa program attracting HNWIs</li>
                      <li>• Strong dirham (pegged to USD)</li>
                      <li>• Remote work visa attracting global talent</li>
                      <li>• Limited new supply in prime areas</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <h4 className="font-semibold text-lg">Total Return Calculation</h4>
              <p>
                To calculate your true ROI, combine rental yield with capital appreciation:
              </p>
              <div className="bg-primary/5 p-4 rounded-md font-mono text-sm">
                Total ROI = Net Rental Yield + Annual Capital Appreciation
              </div>
              <p className="text-muted-foreground text-sm mt-2">
                Example: 7% net yield + 10% appreciation = 17% total annual return
              </p>
            </div>
          ),
          stats: [
            { value: "40%+", label: "Prime Area Growth", subtext: "2020-2025" },
            { value: "AED 1,500", label: "Avg Price/sqft", subtext: "Dubai average" },
            { value: "12%", label: "2024 Growth", subtext: "Market average" },
          ],
        },
        {
          id: "global-comparison",
          title: "Global Market Comparison",
          icon: Globe,
          content: (
            <div className="space-y-6">
              <p>
                Dubai offers some of the most attractive rental yields among global gateway cities, 
                combined with a tax-free environment that significantly boosts net returns.
              </p>

              <h4 className="font-semibold text-lg">Rental Yield Comparison</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">City</th>
                      <th className="text-left py-2 pr-4">Gross Yield</th>
                      <th className="text-left py-2 pr-4">Tax on Rental</th>
                      <th className="text-left py-2">Net Yield (approx)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="bg-primary/5"><td className="py-2 pr-4 font-semibold">Dubai</td><td className="py-2 pr-4">6-10%</td><td className="py-2 pr-4">0%</td><td className="py-2 font-semibold">5-8%</td></tr>
                    <tr><td className="py-2 pr-4">London</td><td className="py-2 pr-4">3-4%</td><td className="py-2 pr-4">20-45%</td><td className="py-2">1.5-2.5%</td></tr>
                    <tr><td className="py-2 pr-4">New York</td><td className="py-2 pr-4">2.5-4%</td><td className="py-2 pr-4">25-37%</td><td className="py-2">1.5-2.5%</td></tr>
                    <tr><td className="py-2 pr-4">Singapore</td><td className="py-2 pr-4">2.5-3.5%</td><td className="py-2 pr-4">0-22%</td><td className="py-2">2-3%</td></tr>
                    <tr><td className="py-2 pr-4">Hong Kong</td><td className="py-2 pr-4">2-3%</td><td className="py-2 pr-4">15%</td><td className="py-2">1.5-2.5%</td></tr>
                    <tr><td className="py-2 pr-4">Sydney</td><td className="py-2 pr-4">3-4%</td><td className="py-2 pr-4">32-45%</td><td className="py-2">2-2.5%</td></tr>
                  </tbody>
                </table>
              </div>

              <h4 className="font-semibold text-lg mt-6">Why Dubai Stands Out</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Zero Income Tax:</strong> 100% of rental income is yours to keep</li>
                <li><strong>No Capital Gains Tax:</strong> Property appreciation is tax-free</li>
                <li><strong>Strong USD Peg:</strong> AED pegged to USD protects against currency fluctuation</li>
                <li><strong>High Tenant Demand:</strong> Growing population and tourism drive occupancy</li>
                <li><strong>Freehold Ownership:</strong> Foreigners can own property outright in designated areas</li>
                <li><strong>Golden Visa:</strong> Property investment can lead to 10-year residency</li>
              </ul>
            </div>
          ),
          stats: [
            { value: "2-3x", label: "Higher Yields", subtext: "vs London/NYC" },
            { value: "0%", label: "Income Tax", subtext: "On rental income" },
            { value: "0%", label: "Capital Gains", subtext: "On property sales" },
          ],
        },
        {
          id: "maximizing-roi",
          title: "Maximizing Your ROI",
          icon: Target,
          content: (
            <div className="space-y-6">
              <p>
                Smart investors can significantly boost returns through strategic property selection, 
                management optimization, and timing. Here are proven strategies:
              </p>

              <h4 className="font-semibold text-lg">Property Selection Strategies</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-3">High-Yield Strategy</h5>
                    <ul className="space-y-2 text-sm">
                      <li>• Focus on studios and 1-bedrooms in JVC, Dubai South</li>
                      <li>• Target AED 500K-800K price range</li>
                      <li>• Aim for 8-10% gross yield</li>
                      <li>• Accept lower appreciation potential</li>
                      <li>• Ideal for income-focused investors</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-3">Balanced Strategy</h5>
                    <ul className="space-y-2 text-sm">
                      <li>• Buy in Business Bay, Marina, Downtown</li>
                      <li>• Target AED 1M-2M price range</li>
                      <li>• Accept 6-8% yield for appreciation</li>
                      <li>• Better tenant quality and retention</li>
                      <li>• Ideal for wealth building</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <h4 className="font-semibold text-lg mt-6">Management Optimization</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Furnish Your Property:</strong> Furnished units command 20-40% higher rents</li>
                <li><strong>Short-Term Rentals:</strong> Holiday homes can yield 30-50% more (requires DTCM license)</li>
                <li><strong>Minimize Vacancy:</strong> Start marketing 2 months before lease ends</li>
                <li><strong>Regular Maintenance:</strong> Well-maintained properties attract better tenants</li>
                <li><strong>Professional Photography:</strong> Quality listings reduce vacancy time by 50%</li>
              </ul>

              <h4 className="font-semibold text-lg mt-6">Timing Considerations</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Off-Plan Entry:</strong> Buy early in launches for 10-15% discount</li>
                <li><strong>Peak Rental Season:</strong> September-November sees highest tenant demand</li>
                <li><strong>Market Cycles:</strong> Dubai typically follows 7-10 year cycles</li>
              </ul>
            </div>
          ),
        },
        {
          id: "risk-factors",
          title: "Risk Factors & Considerations",
          icon: Shield,
          content: (
            <div className="space-y-6">
              <p>
                While Dubai offers attractive returns, understanding and mitigating risks is essential 
                for successful investment. Here's what to consider:
              </p>

              <h4 className="font-semibold text-lg">Market Risks</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Oversupply:</strong> Some areas face high new inventory, pressuring rents</li>
                <li><strong>Economic Cycles:</strong> Dubai's economy tied to oil prices and global trade</li>
                <li><strong>Currency Risk:</strong> Non-USD investors face exchange rate exposure</li>
                <li><strong>Regulatory Changes:</strong> Rental laws and fees can change</li>
              </ul>

              <h4 className="font-semibold text-lg mt-6">Property-Specific Risks</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service Charges:</strong> Can increase significantly, eating into yields</li>
                <li><strong>Tenant Default:</strong> Ejari disputes can take 3-6 months to resolve</li>
                <li><strong>Maintenance Costs:</strong> Older buildings require more upkeep</li>
                <li><strong>Developer Delays:</strong> Off-plan projects may face completion delays</li>
              </ul>

              <h4 className="font-semibold text-lg mt-6">Risk Mitigation Strategies</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-3">Due Diligence</h5>
                    <ul className="space-y-2 text-sm">
                      <li>• Research developer track record</li>
                      <li>• Review building service charge history</li>
                      <li>• Verify RERA registration</li>
                      <li>• Check escrow account status</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h5 className="font-semibold mb-3">Portfolio Approach</h5>
                    <ul className="space-y-2 text-sm">
                      <li>• Diversify across areas</li>
                      <li>• Mix property types</li>
                      <li>• Balance yield vs appreciation</li>
                      <li>• Maintain cash reserves</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          ),
        },
      ]}
      faqs={[
        ...(pageData.faqs || []),
        {
          question: "What is a good rental yield in Dubai?",
          answer: "A good rental yield in Dubai is 6-8% gross (5-6% net). High-yield areas like JVC and International City can achieve 8-10%, while premium areas like Palm Jumeirah typically yield 4-6% but offer better capital appreciation.",
        },
        {
          question: "How do I calculate net rental yield?",
          answer: "Net yield = (Annual Rent - Expenses) ÷ Property Price × 100. Expenses include service charges (AED 12-25/sqft), maintenance (1-2% of value), vacancy (5-8%), and management fees (5-8% of rent if applicable).",
        },
        {
          question: "Is rental income taxed in Dubai?",
          answer: "No, there is zero income tax on rental income in Dubai. There is also no capital gains tax when you sell a property. The main costs are the one-time 4% DLD registration fee and ongoing service charges.",
        },
      ]}
      faqTitle="ROI & Yields FAQ"
      cta={{
        title: "Calculate Your Returns",
        description: "Use our free ROI calculator to estimate your potential returns on Dubai property investment.",
        primaryButton: {
          label: pageData.cta?.label || "Use ROI Calculator",
          href: pageData.cta?.href || "/destinations/dubai/tools/roi-calculator",
        },
        secondaryButton: {
          label: "View Off-Plan Projects",
          href: "/destinations/dubai/off-plan",
        },
      }}
    />
  );
}
