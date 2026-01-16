import { Link } from "wouter";
import { 
  Building2, TrendingUp, DollarSign, Shield, 
  Bitcoin, ChevronRight, BadgeCheck, Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Stats bar with key off-plan metrics
export function OffPlanStatsBar() {
  const stats = [
    { label: "Active Projects", value: "1,577+", icon: Building2 },
    { label: "Entry Price", value: "AED 420K", icon: DollarSign },
    { label: "Avg ROI", value: "15-30%", icon: TrendingUp },
    { label: "Crypto Accepted", value: "BTC/USDT/ETH", icon: Bitcoin },
  ];

  return (
    <div className="bg-muted/50 border-y py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center md:justify-between gap-4 md:gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">{stat.label}:</span>
                <span className="text-sm font-semibold">{stat.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Navigation breadcrumb for pillar pages
interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function OffPlanBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="py-3 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm">
          <li>
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
          </li>
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-1.5">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              {item.href ? (
                <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

// Sub-navigation menu for off-plan section
const OFF_PLAN_NAV_ITEMS = [
  { label: "Overview", href: "/dubai-off-plan-properties" },
  { label: "Investment Guide", href: "/dubai-off-plan-investment-guide" },
  { label: "How to Buy", href: "/how-to-buy-dubai-off-plan" },
  { label: "Payment Plans", href: "/dubai-off-plan-payment-plans" },
  { label: "Best 2026", href: "/best-off-plan-projects-dubai-2026" },
];

export function OffPlanSubNav({ activeHref }: { activeHref: string }) {
  return (
    <div className="border-b bg-background sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-1 overflow-x-auto py-2 -mx-4 px-4 scrollbar-none">
          {OFF_PLAN_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={activeHref === item.href ? "default" : "ghost"}
                size="sm"
                className="whitespace-nowrap"
                data-testid={`nav-offplan-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

// Developer card with detailed stats
interface DeveloperCardProps {
  name: string;
  projects: string;
  activeProjects: string;
  avgRoi: string;
  deliveryRate: string;
  famousFor: string;
  rank?: number;
}

export function DeveloperCard({ 
  name, 
  projects, 
  activeProjects, 
  avgRoi, 
  deliveryRate, 
  famousFor,
  rank 
}: DeveloperCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        {rank && (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {rank}
          </div>
        )}
        <h3 className="font-bold">{name}</h3>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Completed</span>
          <span className="font-medium">{projects}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Active</span>
          <span className="font-medium">{activeProjects}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Avg ROI</span>
          <span className="font-medium text-green-600 dark:text-green-500">{avgRoi}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">On-time</span>
          <span className="font-medium">{deliveryRate}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">{famousFor}</p>
    </Card>
  );
}

// Location area card
interface LocationCardProps {
  name: string;
  projectCount: number;
  priceFrom: string;
  rentalYield: string;
  description: string;
  href: string;
  image?: string;
}

export function LocationCard({
  name,
  projectCount,
  priceFrom,
  rentalYield,
  description,
  href,
  image
}: LocationCardProps) {
  return (
    <Card className="overflow-hidden group">
      {image && (
        <div className="relative h-40">
          <img 
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-3 left-3 text-white">
            <h3 className="font-bold">{name}</h3>
          </div>
          <Badge className="absolute top-3 right-3 bg-primary/90">
            {projectCount} projects
          </Badge>
        </div>
      )}
      <CardContent className={image ? "p-4" : "p-5"}>
        {!image && <h3 className="font-bold mb-3">{name}</h3>}
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-muted-foreground text-xs">From</span>
            <p className="font-semibold text-primary">{priceFrom}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Rental Yield</span>
            <p className="font-semibold text-green-600 dark:text-green-500">{rentalYield}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{description}</p>
        <Link href={href}>
          <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-${name.toLowerCase().replace(/\s+/g, '-')}`}>
            View Projects <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// Project card (compact version)
interface ProjectCardCompactProps {
  name: string;
  developer: string;
  price: string;
  handover: string;
  roi: string;
  paymentPlan: string;
  image: string;
  onEnquire?: () => void;
}

export function ProjectCardCompact({
  name,
  developer,
  price,
  handover,
  roi,
  paymentPlan,
  image,
  onEnquire
}: ProjectCardCompactProps) {
  return (
    <Card className="overflow-hidden group">
      <div className="relative h-36">
        <img 
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge className="bg-green-600/90 text-xs">{roi} ROI</Badge>
          <Badge className="bg-amber-500/90 text-xs">
            <Bitcoin className="w-3 h-3" />
          </Badge>
        </div>
        <div className="absolute bottom-2 left-2 text-white">
          <p className="text-xs text-white/70">{developer}</p>
          <h3 className="font-bold text-sm leading-tight">{name}</h3>
        </div>
      </div>
      <CardContent className="p-3">
        <div className="flex justify-between items-center mb-2">
          <p className="font-semibold text-primary text-sm">{price}</p>
          <Badge variant="outline" className="text-xs">{handover}</Badge>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-muted-foreground">Plan: {paymentPlan}</span>
        </div>
        {onEnquire && (
          <Button variant="outline" size="sm" className="w-full" onClick={onEnquire} data-testid={`button-enquire-${name.toLowerCase().replace(/\s+/g, '-')}`}>
            Get Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Trust signals section
export function TrustSignals() {
  const signals = [
    { icon: Shield, text: "DLD Escrow Protected" },
    { icon: BadgeCheck, text: "RERA Licensed Developers" },
    { icon: Bitcoin, text: "VARA Compliant Crypto" },
    { icon: Clock, text: "24-48hr Processing" },
  ];

  return (
    <section className="py-12 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-10">
          {signals.map((signal) => {
            const Icon = signal.icon;
            return (
              <div key={signal.text} className="flex items-center gap-2 text-sm">
                <Icon className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">{signal.text}</span>
              </div>
            );
          })}
        </div>

        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-3">
            <BadgeCheck className="w-3 h-3 mr-1" />
            You're in Good Hands
          </Badge>
          <h2 className="text-2xl font-bold mb-2">Global Investment Network</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            100+ agents across 5 offices worldwide. DED Licensed (#1096500). 
            Partners with Emaar, DAMAC, Nakheel, Sobha, and Meraas.
          </p>
        </div>
      </div>
    </section>
  );
}

// Info highlight box
interface InfoBoxProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof Building2;
}

export function InfoBox({ title, value, subtitle, icon: Icon }: InfoBoxProps) {
  return (
    <Card className="p-4 text-center">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-xl font-bold text-primary">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </Card>
  );
}

// Page hero section for pillar pages
interface PageHeroProps {
  title: string;
  subtitle: string;
  ctaText?: string;
  onCtaClick?: () => void;
  badge?: string;
}

export function OffPlanPageHero({ title, subtitle, ctaText, onCtaClick, badge }: PageHeroProps) {
  return (
    <section className="py-12 md:py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {badge && (
          <Badge className="mb-4" variant="secondary">
            {badge}
          </Badge>
        )}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
          {title}
        </h1>
        <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
          {subtitle}
        </p>
        {ctaText && onCtaClick && (
          <Button size="lg" onClick={onCtaClick} className="rounded-full px-8" data-testid="button-hero-cta">
            <Building2 className="w-5 h-5 mr-2" />
            {ctaText}
          </Button>
        )}
      </div>
    </section>
  );
}

// Related links section
interface RelatedLink {
  title: string;
  href: string;
  description?: string;
}

export function RelatedLinks({ title, links }: { title: string; links: RelatedLink[] }) {
  return (
    <section className="py-12 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link) => (
            <Link key={link.href} href={link.href} data-testid={`link-related-${link.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <Card className="p-4 hover-elevate h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{link.title}</h3>
                    {link.description && (
                      <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA section (reusable)
interface CTASectionProps {
  title: string;
  subtitle: string;
  ctaText: string;
  onCtaClick: () => void;
  variant?: "primary" | "secondary";
}

export function OffPlanCTASection({ title, subtitle, ctaText, onCtaClick, variant = "primary" }: CTASectionProps) {
  const bgClass = variant === "primary" 
    ? "bg-primary text-primary-foreground" 
    : "bg-muted";
  const buttonVariant = variant === "primary" ? "secondary" : "default";

  return (
    <section className={`py-16 md:py-20 ${bgClass}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
        <p className={`text-lg mb-8 ${variant === "primary" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          {subtitle}
        </p>
        <Button 
          size="lg" 
          variant={buttonVariant}
          className="rounded-full px-8"
          onClick={onCtaClick}
          data-testid="button-cta-section"
        >
          <Building2 className="w-5 h-5 mr-2" />
          {ctaText}
        </Button>
      </div>
    </section>
  );
}

// Common data exports
export const TOP_DEVELOPERS = [
  { name: "Emaar", projects: "150+", active: "18 active", roi: "24%", delivery: "95%", famous: "Burj Khalifa, Dubai Mall" },
  { name: "DAMAC", projects: "200+", active: "31 active", roi: "19%", delivery: "88%", famous: "Damac Hills, Lagoons" },
  { name: "Nakheel", projects: "100+", active: "12 active", roi: "21%", delivery: "91%", famous: "Palm Jumeirah" },
  { name: "Meraas", projects: "30+", active: "9 active", roi: "23%", delivery: "92%", famous: "City Walk, Bluewaters" },
  { name: "Sobha", projects: "50+", active: "14 active", roi: "22%", delivery: "94%", famous: "Sobha Hartland" },
];

export const TOP_LOCATIONS = [
  { name: "Business Bay", projects: 43, priceFrom: "AED 950K", yield: "7-8%", description: "Central business district with metro connectivity" },
  { name: "Dubai Marina", projects: 28, priceFrom: "AED 1.2M", yield: "6-7%", description: "Waterfront living with yacht marina views" },
  { name: "JVC", projects: 58, priceFrom: "AED 650K", yield: "8-9%", description: "Highest rental yields in Dubai" },
  { name: "Palm Jumeirah", projects: 15, priceFrom: "AED 2.5M", yield: "5-6%", description: "Iconic island with beach access" },
  { name: "Dubai Creek Harbour", projects: 12, priceFrom: "AED 1.4M", yield: "7-8%", description: "Next-gen waterfront development" },
  { name: "Dubai South", projects: 34, priceFrom: "AED 450K", yield: "8-10%", description: "Near Expo City with highest growth potential" },
];
