import { Link } from "wouter";
import { ArrowLeft, Plane, Shield, Car, Calendar, ExternalLink, MapPin, CreditCard, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";

interface Integration {
  id: string;
  title: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  url: string;
  partner?: string;
  badge?: string;
  color: string;
}

const integrations: Integration[] = [
  {
    id: "flights",
    title: "Flight Search",
    description: "Compare prices from hundreds of airlines and find the best deals to Dubai.",
    features: ["Compare 100+ airlines", "Price alerts", "Flexible date search", "Multi-city options"],
    icon: <Plane className="w-8 h-8" />,
    url: "https://www.skyscanner.net/flights-to/dxba/cheap-flights-to-dubai.html",
    partner: "Skyscanner",
    badge: "Recommended",
    color: "from-[#0770e3] to-[#00a698]",
  },
  {
    id: "insurance",
    title: "Travel Insurance",
    description: "Protect your trip with comprehensive travel insurance from trusted providers.",
    features: ["Trip cancellation", "Medical coverage", "Baggage protection", "24/7 assistance"],
    icon: <Shield className="w-8 h-8" />,
    url: "https://www.worldnomads.com/travel-insurance/",
    partner: "World Nomads",
    color: "from-[#22c55e] to-[#16a34a]",
  },
  {
    id: "cars",
    title: "Car Rental",
    description: "Rent a car and explore Dubai and the UAE at your own pace.",
    features: ["Best price guarantee", "Free cancellation", "Wide vehicle selection", "Airport pickup"],
    icon: <Car className="w-8 h-8" />,
    url: "https://www.rentalcars.com/",
    partner: "Rentalcars.com",
    color: "from-[#f59e0b] to-[#d97706]",
  },
  {
    id: "calendar",
    title: "Trip Planning",
    description: "Sync your Dubai itinerary with Google Calendar and stay organized.",
    features: ["Export to calendar", "Set reminders", "Share with travel companions", "Offline access"],
    icon: <Calendar className="w-8 h-8" />,
    url: "https://calendar.google.com/",
    partner: "Google Calendar",
    color: "from-[#4285f4] to-[#1a73e8]",
  },
  {
    id: "visa",
    title: "Visa Services",
    description: "Check visa requirements and apply for UAE tourist visa online.",
    features: ["Eligibility check", "Online application", "Express processing", "Document assistance"],
    icon: <Globe className="w-8 h-8" />,
    url: "https://www.visitdubai.com/en/plan-your-trip/visas-and-entry",
    partner: "Visit Dubai",
    badge: "Official",
    color: "from-[#8b5cf6] to-[#7c3aed]",
  },
  {
    id: "attractions",
    title: "Attraction Tickets",
    description: "Book skip-the-line tickets for Dubai's top attractions and experiences.",
    features: ["Skip-the-line entry", "Mobile tickets", "Free cancellation", "Best price guarantee"],
    icon: <MapPin className="w-8 h-8" />,
    url: "https://www.getyourguide.com/dubai-l173/",
    partner: "GetYourGuide",
    color: "from-[#6443F4] to-[#5035d4]",
  },
  {
    id: "payments",
    title: "Currency & Payments",
    description: "Get the best exchange rates and use multi-currency travel cards.",
    features: ["No hidden fees", "Real-time rates", "ATM withdrawals", "Spend tracking"],
    icon: <CreditCard className="w-8 h-8" />,
    url: "https://wise.com/",
    partner: "Wise",
    color: "from-[#00b9ff] to-[#0091d5]",
  },
];

export default function PublicIntegrations() {
  return (
    <div className="bg-background min-h-screen">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b" data-testid="nav-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo variant="primary" height={28} />
            <div className="hidden md:flex items-center gap-8">
              <Link href="/hotels" className="text-foreground/80 hover:text-primary font-medium transition-colors">Hotels</Link>
              <Link href="/attractions" className="text-foreground/80 hover:text-primary font-medium transition-colors">Attractions</Link>
              <Link href="/tools/plan" className="text-primary font-medium">Plan</Link>
              <Link href="/articles" className="text-foreground/80 hover:text-primary font-medium transition-colors">News</Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="bg-[#6443F4] py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTAgMzBoNjAiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0zMCAwdjYwIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
        <div className="absolute top-5 right-10 w-36 h-36 bg-[#6443F4]/20 rounded-full blur-3xl opacity-25" />
        <div className="absolute bottom-10 left-20 w-32 h-32 bg-[#6443F4]/30 rounded-full blur-3xl opacity-20" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
              <Plane className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">Plan Your Dubai Trip</h1>
              <p className="text-white/90">Essential tools and partner services for your journey</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => (
              <Card key={integration.id} className="overflow-hidden flex flex-col" data-testid={`card-integration-${integration.id}`}>
                <div className="bg-[#6443F4] p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      {integration.icon}
                    </div>
                    {integration.badge && (
                      <Badge className="bg-white/20 text-white border-0 no-default-hover-elevate no-default-active-elevate">
                        {integration.badge}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-heading text-xl font-bold mt-4">{integration.title}</h3>
                  {integration.partner && (
                    <p className="text-white/80 text-sm">via {integration.partner}</p>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-muted-foreground text-sm mb-4">{integration.description}</p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {integration.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a href={integration.url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full" variant="outline" data-testid={`button-visit-${integration.id}`}>
                      Visit {integration.partner || integration.title}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Plane className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">Book Your Flight</h3>
              <p className="text-muted-foreground text-sm">Compare prices from 100+ airlines and find the best deals to Dubai</p>
            </Card>
            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">Get Protected</h3>
              <p className="text-muted-foreground text-sm">Travel with peace of mind with comprehensive travel insurance</p>
            </Card>
            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">Explore Freely</h3>
              <p className="text-muted-foreground text-sm">Rent a car and discover Dubai and the UAE at your own pace</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 bg-[#6443F4] border-0 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="font-heading text-2xl font-bold mb-2">Ready to Plan Your Budget?</h3>
                <p className="text-white/90">Calculate your trip costs and discover upcoming events in Dubai</p>
              </div>
              <div className="flex gap-3">
                <Link href="/tools/budget">
                  <Button className="bg-white text-blue-600 hover:bg-white/90" data-testid="link-budget">
                    Budget Calculator
                  </Button>
                </Link>
                <Link href="/tools/events">
                  <Button variant="outline" className="border-white/50 text-white hover:bg-white/10" data-testid="link-events">
                    Events Calendar
                  </Button>
                </Link>
                <Link href="/tools/currency">
                  <Button variant="outline" className="border-white/50 text-white hover:bg-white/10" data-testid="link-currency">
                    Currency Converter
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <footer className="py-8 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo variant="primary" height={28} />
            <div className="flex items-center gap-6 text-muted-foreground text-sm">
              <Link href="/hotels" className="hover:text-foreground transition-colors">Hotels</Link>
              <Link href="/attractions" className="hover:text-foreground transition-colors">Attractions</Link>
              <Link href="/tools/plan" className="hover:text-foreground transition-colors">Plan</Link>
              <Link href="/articles" className="hover:text-foreground transition-colors">News</Link>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <span>2026 Travi</span>
            </div>
          </div>
        </div>
      </footer>

      <section className="py-4 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-muted-foreground">
            Affiliate Disclosure: Some links on this page are affiliate links. We may earn a commission at no extra cost to you.
          </p>
        </div>
      </section>
    </div>
  );
}
