import { DubaiComparisonTemplate } from "./templates/DubaiComparisonTemplate";

export default function CompareDowntownVsMarina() {
  return (
    <DubaiComparisonTemplate
      title="Downtown Dubai vs Marina 2026 - Area Comparison"
      metaDescription="Compare Downtown Dubai and Dubai Marina for living and investment. Analyze lifestyle, prices, rental yields, and which area suits your preferences."
      canonicalPath="/destinations/dubai/compare/downtown-vs-marina"
      keywords={["downtown vs marina", "dubai area comparison", "downtown dubai living", "marina lifestyle", "where to live dubai"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Compare", href: "/destinations/dubai/compare" },
        { label: "Downtown vs Marina", href: "/destinations/dubai/compare/downtown-vs-marina" }
      ]}
      hero={{
        title: "Downtown vs Marina",
        subtitle: "Dubai's two most iconic areas compared for lifestyle and investment potential",
        image: "/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp",
        badges: [
          { label: "Lifestyle Battle" },
          { label: "Price Comparison" },
          { label: "Investment Analysis" }
        ]
      }}
      comparisonTitle="Downtown Dubai vs Marina Comparison"
      comparisonSubtitle="Compare Dubai's two most prestigious lifestyle destinations"
      optionATitle="Downtown Dubai"
      optionABadge="City Center"
      optionBTitle="Dubai Marina"
      optionBBadge="Waterfront Living"
      features={[
        { feature: "Average Price (per sqft)", optionA: "AED 2,200-3,500", optionB: "AED 1,500-2,200", highlight: "B" },
        { feature: "Average Rental Yield", optionA: "5-7%", optionB: "6-8%", highlight: "B" },
        { feature: "1-Bed Price Range", optionA: "AED 1.5M-3M", optionB: "AED 1M-1.8M", highlight: "B" },
        { feature: "Lifestyle Vibe", optionA: "Urban, upscale, tourist hub", optionB: "Beachfront, social, active" },
        { feature: "Beach Access", optionA: "15-20 mins to JBR", optionB: "Walking distance", highlight: "B" },
        { feature: "Metro Access", optionA: "Burj Khalifa Station", optionB: "Multiple stations", highlight: "B" },
        { feature: "Nightlife & Dining", optionA: "5-star hotels, rooftops", optionB: "Marina Walk, JBR Beach", highlight: "B" },
        { feature: "Capital Appreciation", optionA: "Highest in Dubai", optionB: "Strong & stable", highlight: "A" },
        { feature: "Tenant Demographics", optionA: "Executives, tourists", optionB: "Professionals, expats" },
        { feature: "Walkability", optionA: "Excellent (Boulevard)", optionB: "Excellent (Marina Walk)", highlight: "A" }
      ]}
      optionA={{
        title: "Downtown Dubai",
        badge: "Best for Prestige",
        prosAndCons: [
          { text: "Home to Burj Khalifa, Dubai Mall, Dubai Opera", type: "pro" },
          { text: "Highest capital appreciation in Dubai", type: "pro" },
          { text: "Premium address recognized globally", type: "pro" },
          { text: "Walkable Boulevard with high-end dining", type: "pro" },
          { text: "Highest property prices in Dubai", type: "con" },
          { text: "Tourist crowds around major attractions", type: "con" },
          { text: "No beach access - 15-20 mins to nearest beach", type: "con" }
        ]
      }}
      optionB={{
        title: "Dubai Marina",
        badge: "Best for Lifestyle",
        prosAndCons: [
          { text: "Stunning waterfront views and yacht lifestyle", type: "pro" },
          { text: "Walking distance to JBR Beach", type: "pro" },
          { text: "More affordable than Downtown with good yields", type: "pro" },
          { text: "Vibrant social scene with 200+ restaurants", type: "pro" },
          { text: "Can feel crowded during peak seasons", type: "con" },
          { text: "Some older buildings need renovation", type: "con" },
          { text: "Lower capital appreciation than Downtown", type: "con" }
        ]
      }}
      verdict={{
        title: "Our Verdict",
        recommendation: "Marina for Lifestyle, Downtown for Investment",
        description: "Choose Downtown Dubai if you want the prestige of Dubai's most iconic address, maximum capital appreciation, and proximity to world-famous attractions. Choose Dubai Marina if you prefer a beachfront lifestyle, social atmosphere, and better value for money. For rental investment, Marina offers higher yields; for long-term capital growth, Downtown wins.",
        winnerLabel: "Depends on Your Priority"
      }}
      faqs={[
        {
          question: "Is Downtown Dubai or Marina better for rental income?",
          answer: "Dubai Marina typically offers better rental yields (6-8%) compared to Downtown (5-7%) due to lower purchase prices and strong tenant demand from professionals. However, Downtown can command higher absolute rents for premium units."
        },
        {
          question: "Which area is better for families?",
          answer: "Neither is ideal for families with children - both are better suited for couples and professionals. For families, consider Dubai Hills, Arabian Ranches, or Jumeirah. Between the two, Marina has more outdoor activities and beach access."
        },
        {
          question: "How is the traffic in Downtown vs Marina?",
          answer: "Downtown can experience significant traffic around Dubai Mall, especially during weekends and events. Marina has its own congestion points but offers better alternative routes. Both areas have excellent metro connectivity."
        },
        {
          question: "Which area has better restaurants and nightlife?",
          answer: "Both excel in dining. Downtown offers more luxury hotel restaurants and rooftop venues (At.mosphere, Armani). Marina provides casual waterfront dining and a more social, outdoor atmosphere with Marina Walk and JBR."
        },
        {
          question: "Can I walk to work from either area?",
          answer: "Downtown is better for those working in DIFC (10-15 min walk). Marina is ideal for Media City/Internet City employees. Both have excellent metro access for commuting to other business districts."
        }
      ]}
      cta={{
        title: "Find Your Perfect Dubai Address",
        description: "Explore available properties in Downtown Dubai and Dubai Marina",
        primaryLabel: "Explore Downtown",
        primaryHref: "/destinations/dubai/districts/downtown",
        secondaryLabel: "View Marina Properties",
        secondaryHref: "/destinations/dubai/districts/marina",
        variant: "gradient"
      }}
    />
  );
}
