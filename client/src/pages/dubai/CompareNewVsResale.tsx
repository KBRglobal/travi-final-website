import { DubaiComparisonTemplate } from "./templates/DubaiComparisonTemplate";

export default function CompareNewVsResale() {
  return (
    <DubaiComparisonTemplate
      title="New vs Resale Property Dubai 2026 - Which to Buy?"
      metaDescription="Compare buying new (off-plan/ready) versus resale property in Dubai. Understand pricing, quality, location options, and investment implications."
      canonicalPath="/destinations/dubai/compare/new-vs-resale"
      keywords={["new vs resale dubai", "secondary market dubai", "resale property dubai", "new property benefits", "resale advantages"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Compare", href: "/destinations/dubai/compare" },
        { label: "New vs Resale", href: "/destinations/dubai/compare/new-vs-resale" }
      ]}
      hero={{
        title: "New vs Resale Property",
        subtitle: "Analyzing the pros and cons of new developments versus secondary market purchases",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Market Comparison" },
          { label: "Price Analysis" },
          { label: "Quality Check" }
        ]
      }}
      comparisonTitle="New vs Resale Property Comparison"
      comparisonSubtitle="Compare primary market (new) versus secondary market (resale) property in Dubai"
      optionATitle="New Property (Primary Market)"
      optionABadge="Latest Specifications"
      optionBTitle="Resale Property (Secondary Market)"
      optionBBadge="Established Locations"
      features={[
        { feature: "Pricing", optionA: "Developer price (negotiable)", optionB: "Market price (very negotiable)", highlight: "B" },
        { feature: "Payment Options", optionA: "Payment plans (0% interest)", optionB: "Cash or mortgage only", highlight: "A" },
        { feature: "Location Choices", optionA: "New/emerging areas", optionB: "Established prime areas", highlight: "B" },
        { feature: "Property Condition", optionA: "Brand new, modern specs", optionB: "May need renovation", highlight: "A" },
        { feature: "Warranty", optionA: "Developer warranty (1-10 years)", optionB: "None", highlight: "A" },
        { feature: "Move-in Timeline", optionA: "Immediate or 2-4 years", optionB: "Immediate", highlight: "B" },
        { feature: "Negotiation Room", optionA: "Limited (5-10%)", optionB: "Higher (10-20%)", highlight: "B" },
        { feature: "Property Inspection", optionA: "Model unit only (off-plan)", optionB: "Full inspection", highlight: "B" },
        { feature: "View Certainty", optionA: "May change with future developments", optionB: "Known views", highlight: "B" },
        { feature: "Service Charges", optionA: "Set by developer", optionB: "Known track record", highlight: "B" }
      ]}
      optionA={{
        title: "New Property",
        badge: "Best for Modern Specs",
        prosAndCons: [
          { text: "Latest specifications, modern designs, smart home features", type: "pro" },
          { text: "Developer payment plans with 0% interest", type: "pro" },
          { text: "Warranty coverage for defects and maintenance", type: "pro" },
          { text: "First owner - no previous wear and tear", type: "pro" },
          { text: "Off-plan means 2-4 year wait for completion", type: "con" },
          { text: "Limited to new development areas", type: "con" },
          { text: "Cannot inspect actual unit before purchase (off-plan)", type: "con" }
        ]
      }}
      optionB={{
        title: "Resale Property",
        badge: "Best for Location",
        prosAndCons: [
          { text: "Access to prime, established locations", type: "pro" },
          { text: "Full property inspection before purchase", type: "pro" },
          { text: "Known views - no future development surprises", type: "pro" },
          { text: "Often more negotiable pricing", type: "pro" },
          { text: "May require renovation or updates", type: "con" },
          { text: "No payment plan - need full cash or mortgage", type: "con" },
          { text: "No developer warranty coverage", type: "con" }
        ]
      }}
      verdict={{
        title: "Our Verdict",
        recommendation: "New for Features, Resale for Location",
        description: "Choose new property if you want modern specifications, smart home features, and flexible payment plans - especially if you're happy with emerging areas. Choose resale if you prioritize prime established locations (Palm Jumeirah, Marina, Downtown), want to negotiate harder on price, or need to move in immediately. For first-time Dubai investors, new property with payment plans offers easier entry; for end-users, resale provides more choice in desirable areas.",
        winnerLabel: "Depends on Priorities"
      }}
      faqs={[
        {
          question: "Are resale properties cheaper than new in Dubai?",
          answer: "It depends on the market cycle. In strong markets, new properties may be priced higher. In slower markets, motivated resale sellers may offer significant discounts (10-20%). Resale also has more negotiation room than developer sales."
        },
        {
          question: "Can I get a mortgage for both new and resale?",
          answer: "Yes, UAE banks offer mortgages for both. Resale mortgages are straightforward. For new properties, some banks offer off-plan mortgages (typically after 50% construction), or you can arrange a mortgage at handover for ready new units."
        },
        {
          question: "How do I check a resale property's history?",
          answer: "Request the Title Deed from DLD, review service charge history from the Owners Association, check for any liens or disputes, and inspect the property thoroughly. A good broker will help with due diligence."
        },
        {
          question: "What about service charges - new vs resale?",
          answer: "New properties have developer-set service charges that may increase over time. Resale properties have an established track record so you know the actual costs. Always ask for 3+ years of service charge statements for resale properties."
        },
        {
          question: "Which offers better capital appreciation?",
          answer: "New properties in emerging areas can appreciate significantly as the area develops. Resale in established areas offers stable, moderate appreciation. Trophy properties (Palm, Downtown) tend to appreciate regardless of age."
        }
      ]}
      cta={{
        title: "Explore Dubai Property Options",
        description: "Browse new off-plan projects or search the resale market",
        primaryLabel: "View New Projects",
        primaryHref: "/destinations/dubai/off-plan",
        secondaryLabel: "Browse Resale",
        secondaryHref: "/destinations/dubai/districts",
        variant: "gradient"
      }}
    />
  );
}
