import { useState } from "react";
import {
  Building2, Home, TrendingUp, DollarSign,
  Shield, Clock, CheckCircle2, ChevronDown,
  Mail, User, ArrowRight, Landmark, ChevronLeft,
  Sparkles, Bitcoin, Banknote, Building, CalendarDays,
  Key, BadgeCheck, Wallet, Lock, Zap, Heart, X, ThumbsDown,
  CreditCard, Search, Calculator, FileText, Compass, BookOpen, Scale, Users
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { LiveEditToggle } from "@/components/live-edit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion, AnimatePresence } from "framer-motion";

// ===== 2024-2025 COMPREHENSIVE MARKET DATA =====

// Market Overview Stats (2024)
const MARKET_STATS = [
  { value: "226,000", label: "Transactions", subtext: "+36% YoY", icon: Building2 },
  { value: "AED 761B", label: "Total Value", subtext: "$207 billion", icon: DollarSign },
  { value: "110,000", label: "New Investors", subtext: "+55% increase", icon: Users },
  { value: "60-68%", label: "Off-Plan Share", subtext: "Of all deals", icon: TrendingUp },
  { value: "200.7", label: "Price Index", subtext: "Doubled since 2021", icon: TrendingUp },
];

// Top Real Estate Agencies (Tier 1)
const TOP_AGENCIES = [
  { name: "fäm Properties", founded: "2009", agents: "650+", specialty: "Full-service, off-plan", achievement: "Largest brokerage; AED 1.8B+ revenue" },
  { name: "Allsopp & Allsopp", founded: "2008", agents: "300-500", specialty: "UK-style residential", achievement: "Bayut Agency of Year 2024 & 2023" },
  { name: "Betterhomes", founded: "1986", agents: "166+", specialty: "Residential, commercial", achievement: "Oldest major agency; 4.8/5 TrustPilot" },
  { name: "Driven Properties", founded: "-", agents: "100+", specialty: "Luxury, off-plan", achievement: "AED 175M villa record sale" },
  { name: "Haus & Haus", founded: "2013", agents: "150+", specialty: "Residential, property mgmt", achievement: "Emaar Broker Awards Top 10" },
  { name: "Dubai Sotheby's", founded: "2013", agents: "50+", specialty: "Ultra-luxury (AED 30M+)", achievement: "AED 5B+ Dubai portfolio" },
];

// Expanded Developers Data
const EXPANDED_DEVELOPERS = [
  {
    name: "Emaar",
    tier: 1,
    unitsDelivered: "108,000+",
    landReserve: "405M sqft",
    marketCap: "AED 70.09B",
    investment: "AED 65B (5-year plan)",
    flagships: "Burj Khalifa, Dubai Mall, Downtown Dubai, Dubai Hills Estate, Dubai Creek Harbour",
    priceRange: "1BR from AED 1.3M | Townhouses from AED 2.9M | Villas from AED 8.1M+",
    paymentPlans: "80/20, 60/40, 90/10",
    quality: 5,
    onTimeRate: "90%+",
  },
  {
    name: "DAMAC",
    tier: 1,
    unitsDelivered: "48,000-50,000",
    pipeline: "50,000-54,000 units",
    masterCommunities: "7 (targeting 70)",
    partnerships: "Versace, Fendi, Trump, Mercedes-Benz (2026)",
    flagships: "DAMAC Hills, DAMAC Lagoons (42M sqft), DAMAC Islands (45M sqft)",
    priceRange: "Apartments from AED 980K | Villas from AED 2.25M | Branded from AED 2.5M+",
    paymentPlans: "75/25, 70/30, 80/20, Crypto accepted",
    quality: 4,
    onTimeRate: "70-75%",
  },
  {
    name: "Nakheel",
    tier: 1,
    unitsDelivered: "Government-backed",
    flagships: "Palm Jumeirah, Palm Jebel Ali (2x size, 35,000 families), Dubai Islands, Como Residences",
    recentLaunches: "Palm Jebel Ali Beach Villas (AED 5B+ contracts)",
    priceRange: "Premium waterfront pricing",
    paymentPlans: "60/40, 70/30",
    quality: 5,
    onTimeRate: "91%",
  },
  {
    name: "Sobha",
    tier: 1,
    unitsDelivered: "Premium quality focus",
    flagship: "Sobha Hartland (8M sqft, AED 55B valuation)",
    hartland2: "22 towers, 37-70 floors",
    differentiator: "Backward integration—controls entire construction",
    priceRange: "1BR from AED 1.3M | 5BR villas from AED 22.7M",
    paymentPlans: "70/30, Post-handover available",
    quality: 5,
    onTimeRate: "95%+",
  },
  {
    name: "Meraas",
    tier: 1,
    flagships: "Bluewaters Island (Ain Dubai), City Walk, La Mer, Madinat Jumeirah Living",
    priceRange: "City Walk from AED 2.6M | Bluewaters from AED 2.8M | Jumeira Bay from AED 63M+",
    paymentPlans: "50/50, 60/40",
    quality: 5,
    positioning: "Ultra-premium lifestyle destinations",
  },
  {
    name: "Omniyat",
    tier: 1,
    specialty: "Ultra-luxury specialist",
    flagships: "The Opus (Zaha Hadid), One at Palm Jumeirah, ORLA/VELA/ELA (Dorchester)",
    priceRange: "ELA from ~AED 43M | ORLA Sky Palaces AED 75M+",
    target: "Ultra-high-net-worth individuals only",
    quality: 5,
  },
];

// Tier 2 Developers
const TIER2_DEVELOPERS = [
  { name: "Binghatti", stats: "80+ projects, AED 70B portfolio", startingPrice: "AED 520K (JVC)", paymentPlan: "70/30" },
  { name: "Danube Properties", stats: "31 projects, 15,000+ units", startingPrice: "AED 399K (Arjan)", paymentPlan: "1% monthly (exclusive)" },
  { name: "Azizi Developments", stats: "40,000 units pipeline", startingPrice: "AED 561K (Al Furjan)", paymentPlan: "50/50 or 60/40" },
  { name: "Ellington Properties", stats: "34+ design-led projects", startingPrice: "AED 420K (JVC)", paymentPlan: "70/30" },
  { name: "Samana Developers", stats: "44 projects, pools in every unit", startingPrice: "AED 570K", paymentPlan: "8.5-year extended" },
  { name: "Dubai Holding", stats: "Madinat Jumeirah Living", startingPrice: "AED 1.5M+", paymentPlan: "50/50 + DLD waiver" },
];

// Area Analysis with Pricing
const AREA_ANALYSIS = [
  { 
    area: "Palm Jumeirah", 
    category: "Premium/Luxury",
    pricePerSqft: "AED 2,500-6,000+",
    rentalYield: "5-6%",
    appreciation3Y: "45-68%",
    entryPrice: "1BR from AED 2.5M",
    recordSale: "AED 161M villa (2025)",
    bestFor: "UHNWIs, celebrities, short-term rental"
  },
  { 
    area: "Downtown Dubai", 
    category: "Premium/Luxury",
    pricePerSqft: "AED 2,700-3,500",
    rentalYield: "6.2-7.9%",
    appreciation3Y: "45-50%",
    entryPrice: "1BR from AED 1.8M",
    bestFor: "Business executives, luxury lifestyle, Airbnb"
  },
  { 
    area: "Dubai Marina", 
    category: "Premium/Luxury",
    pricePerSqft: "AED 2,000-2,800",
    rentalYield: "5.5-7.5%",
    appreciation3Y: "40-45%",
    entryPrice: "1BR from AED 1.3M",
    bestFor: "Young professionals, digital nomads"
  },
  { 
    area: "Business Bay", 
    category: "Mid-Premium",
    pricePerSqft: "AED 2,300-2,600",
    rentalYield: "6-7%",
    appreciation3Y: "35-45%",
    entryPrice: "Studio from AED 640K",
    bestFor: "First-time buyers, professionals",
    note: "69+ off-plan projects"
  },
  { 
    area: "JVC (Jumeirah Village Circle)", 
    category: "High-Yield Mid-Range",
    pricePerSqft: "AED 1,469-1,496",
    rentalYield: "7-8.64%",
    appreciation3Y: "35-45%",
    entryPrice: "Studio from AED 400K",
    transactionVolume: "AED 14.7-16.6B (Q4 2024)",
    bestFor: "Buy-to-let investors, first-time buyers"
  },
  { 
    area: "Dubai Silicon Oasis", 
    category: "High-Yield",
    pricePerSqft: "AED 939-1,512",
    rentalYield: "7.7-9.8%",
    appreciation3Y: "57-80%",
    entryPrice: "Studio from AED 410K",
    bestFor: "Tech workers, yield-focused investors"
  },
  { 
    area: "Discovery Gardens", 
    category: "Affordable High-Yield",
    pricePerSqft: "AED 1,042-1,270",
    rentalYield: "9-9.8%",
    entryPrice: "From AED 350K",
    bestFor: "Cash flow focused investors"
  },
  { 
    area: "Dubai South", 
    category: "Emerging Growth",
    pricePerSqft: "AED 800-1,200",
    rentalYield: "7.5-9.5%",
    projectedGrowth: "35-45% by 2030",
    entryPrice: "Studio from AED 450K",
    catalyst: "AED 128B Al Maktoum Airport expansion",
    bestFor: "Long-term appreciation"
  },
];

// Payment Plans Comparison
const PAYMENT_PLANS = [
  { type: "1% Monthly", structure: "20% down + 1%/month + balance handover", developers: "Danube (exclusive)", highlight: true },
  { type: "Extended 8.5-Year", structure: "1% monthly + 0.5% post-handover", developers: "Samana" },
  { type: "50/50", structure: "50% construction, 50% handover", developers: "Emaar (select), QUBE" },
  { type: "60/40", structure: "60% construction, 40% handover", developers: "Emaar, Nakheel, MAF" },
  { type: "70/30", structure: "70% construction, 30% handover", developers: "Binghatti, Ellington" },
  { type: "Post-Handover", structure: "20-40% after completion, 2-5 years", developers: "Samana, Sobha, DAMAC" },
];

// Golden Visa Requirements
const GOLDEN_VISA_INFO = {
  minimumInvestment: "AED 2 million (~USD 545,000)",
  propertyType: "Freehold only (DIFC excluded)",
  canCombine: true,
  offPlanAccepted: "If fully paid and registered",
  mortgageEligible: "If AED 2M+ equity paid",
  duration: "10-year renewable residence",
  familySponsorship: "Automatic (spouse & children)",
  processing: "7-10 working days via DLD Cube",
  cost: "~AED 9,884.75 total",
  benefits: [
    "No sponsor required",
    "Live/work anywhere in UAE",
    "Renewable indefinitely",
    "No 6-month UAE visit requirement",
  ],
};

// Historical Price Growth
const PRICE_HISTORY = [
  { year: "2021", avgPrice: 794, yoyChange: "+7.8%", cumulative: "Baseline" },
  { year: "2022", avgPrice: 1039, yoyChange: "+30.9%", cumulative: "+31%" },
  { year: "2023", avgPrice: 1365, yoyChange: "+14.1%", cumulative: "+72%" },
  { year: "2024", avgPrice: 1524, yoyChange: "+11.6%", cumulative: "+92%" },
  { year: "2025", avgPrice: 1750, yoyChange: "+15-20%", cumulative: "+120%" },
];

// Top Performers 2024
const TOP_PERFORMERS = {
  villas: [
    { area: "Jumeirah Islands", growth: "+42.5%" },
    { area: "Palm Jumeirah", growth: "+42.3%" },
    { area: "Emirates Hills", growth: "+32.3%" },
  ],
  apartments: [
    { area: "The Greens", growth: "+31%" },
    { area: "Palm Jumeirah", growth: "+28.3%" },
    { area: "The Views", growth: "+27.1%" },
  ],
};

// Quick info items
const QUICK_INFO = [
  { label: "From AED 450K", icon: DollarSign },
  { label: "Crypto & Cash Accepted", icon: Bitcoin },
  { label: "3-5 Year Payment Plans", icon: CalendarDays },
  { label: "15-30% Capital Gains", icon: TrendingUp },
  { label: "Top Developers", icon: Building2 },
];

// Why off-plan advantages (8 benefits with data)
const OFF_PLAN_ADVANTAGES = [
  {
    icon: DollarSign,
    title: "15-25% Below Market Price",
    description: "Lock in today's prices for 2026-2027 delivery. Example: Business Bay 2-bed selling ready at AED 1.8M costs AED 1.35M off-plan.",
    source: "Property Finder Q4 2024",
  },
  {
    icon: CalendarDays,
    title: "Flexible Payment (3-5 Years)",
    description: "Typical: 10-20% down, 50-70% during construction, 20-30% on handover. Total spread across 36 months vs 70% upfront for ready.",
    source: "66% cite this as primary motivator (DLD 2024)",
  },
  {
    icon: TrendingUp,
    title: "Capital Appreciation (15-30%)",
    description: "Properties gain value during construction. Emaar Creek Harbour units from 2019 now worth 28% more at 2026 handover.",
    source: "Knight Frank Dubai 2024",
  },
  {
    icon: Key,
    title: "Post-Handover Plans",
    description: "Pay final 20-40% over 3-5 years AFTER handover. Live in or rent out while still paying. Available in 68% of new launches.",
    source: "DAMAC, Emaar, Meraas offer this",
  },
  {
    icon: Sparkles,
    title: "Choose Best Units First",
    description: "Pre-launch access = premium views, high floors, corner units. These sell out in 24-48 hours during public launch.",
    source: "Our clients get 2-4 week head start",
  },
  {
    icon: Building2,
    title: "Modern Design & Smart Features",
    description: "New developments include smart home systems, LEED certification, EV charging, co-working spaces. 100% of 2026 launches have smart home integration.",
    source: "2026 Developer Standards",
  },
  {
    icon: BadgeCheck,
    title: "Investor Visa Eligibility",
    description: "AED 750K+ property = 2-year renewable visa. AED 2M+ property = 10-year Golden Visa for entire family. Processing: 2-4 weeks after handover.",
    source: "UAE Immigration Authority",
  },
  {
    icon: Shield,
    title: "Maximum Buyer Protection",
    description: "DLD escrow accounts + RERA licensing + milestone verification = safest pre-construction market globally. Zero fund loss risk.",
    source: "UAE rated #1 globally (JLL 2024)",
  },
];

// Property types for wizard
const PROPERTY_TYPES = [
  { id: "studio", label: "Studio", price: "From AED 450K", icon: Building },
  { id: "1bed", label: "1-Bedroom", price: "From AED 700K", icon: Home },
  { id: "2bed", label: "2-3 Bedroom", price: "From AED 1.1M", icon: Building2 },
  { id: "townhouse", label: "Townhouse", price: "From AED 1.8M", icon: Home },
  { id: "villa", label: "Villa", price: "From AED 3M+", icon: Landmark },
];

// Budget ranges
const BUDGET_RANGES = [
  { id: "450k-700k", label: "AED 450K - 700K", description: "Studios & small apartments" },
  { id: "700k-1.5m", label: "AED 700K - 1.5M", description: "1-2 Bedroom apartments" },
  { id: "1.5m-3m", label: "AED 1.5M - 3M", description: "Large apartments & townhouses" },
  { id: "3m-5m", label: "AED 3M - 5M", description: "Villas & luxury apartments" },
  { id: "5m+", label: "AED 5M+", description: "Luxury villas & penthouses" },
];

// Payment methods
const PAYMENT_METHODS = [
  { id: "cash", label: "Cash / Bank Transfer", icon: Banknote, description: "AED, USD, EUR, GBP" },
  { id: "crypto", label: "Cryptocurrency", icon: Bitcoin, description: "BTC, USDT, ETH" },
  { id: "both", label: "Flexible (Both)", icon: Wallet, description: "Mix crypto & cash" },
];

// Top areas with sample projects (12 exclusive pre-launch projects)
const TOP_AREAS = [
  {
    name: "Dubai Creek Harbour - Creek Beach",
    developer: "Emaar",
    type: "Waterfront City",
    price: "2-bed from AED 1.8M",
    handover: "Q4 2026",
    roi: "24%",
    plan: "60/40",
    image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&h=400&fit=crop",
  },
  {
    name: "DAMAC Lagoons - Portofino",
    developer: "DAMAC",
    type: "Mediterranean Themed",
    price: "3-bed from AED 1.2M",
    handover: "Q2 2026",
    roi: "19%",
    plan: "20/80",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop",
  },
  {
    name: "Sobha Hartland II - Waves Grande",
    developer: "Sobha",
    type: "Luxury Waterfront",
    price: "2-bed from AED 2.2M",
    handover: "Q3 2026",
    roi: "21%",
    plan: "70/30",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop",
  },
  {
    name: "Emaar - The Valley Phase 3",
    developer: "Emaar",
    type: "Nature Community",
    price: "3-bed from AED 850K",
    handover: "Q1 2027",
    roi: "27%",
    plan: "60/40 + 3yr post",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop",
  },
  {
    name: "Business Bay Towers",
    developer: "Multiple",
    type: "Business District",
    price: "1-bed from AED 950K",
    handover: "Q2 2026",
    roi: "18%",
    plan: "Various",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop",
  },
  {
    name: "JVC Premium Residences",
    developer: "Azizi",
    type: "High Yield Area",
    price: "Studio from AED 650K",
    handover: "Q4 2026",
    roi: "22%",
    plan: "60/40",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop",
  },
  {
    name: "Dubai Marina - New Towers",
    developer: "Multiple",
    type: "Waterfront Living",
    price: "1-bed from AED 1.2M",
    handover: "Q3 2027",
    roi: "16%",
    plan: "50/50",
    image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600&h=400&fit=crop",
  },
  {
    name: "Palm Jumeirah Residences",
    developer: "Nakheel",
    type: "Luxury Island",
    price: "2-bed from AED 3.2M",
    handover: "Q4 2026",
    roi: "15%",
    plan: "70/30",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop",
  },
  {
    name: "MBR City Villas",
    developer: "Multiple",
    type: "Mega Community",
    price: "Villas from AED 2.5M",
    handover: "2026-2027",
    roi: "20%",
    plan: "Various",
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=400&fit=crop",
  },
  {
    name: "Dubai South - Expo District",
    developer: "Multiple",
    type: "Future Growth Zone",
    price: "Studio from AED 450K",
    handover: "Q2 2026",
    roi: "28%",
    plan: "20/80",
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop",
  },
  {
    name: "Al Furjan Community",
    developer: "Multiple",
    type: "Family Community",
    price: "1-bed from AED 780K",
    handover: "Q4 2026",
    roi: "19%",
    plan: "60/40",
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&h=400&fit=crop",
  },
  {
    name: "Meraas - Port de La Mer",
    developer: "Meraas",
    type: "Mediterranean Living",
    price: "2-bed from AED 2.8M",
    handover: "Q1 2027",
    roi: "17%",
    plan: "60/40",
    image: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&h=400&fit=crop",
  },
];

// Developers (with detailed stats)
const DEVELOPERS = [
  { name: "Emaar", projects: "150+", active: "18 active", roi: "24%", delivery: "95%", famous: "Burj Khalifa, Dubai Mall" },
  { name: "DAMAC", projects: "200+", active: "31 active", roi: "19%", delivery: "88%", famous: "Damac Hills, Lagoons" },
  { name: "Nakheel", projects: "100+", active: "12 active", roi: "21%", delivery: "91%", famous: "Palm Jumeirah" },
  { name: "Meraas", projects: "30+", active: "9 active", roi: "23%", delivery: "92%", famous: "City Walk, Bluewaters" },
  { name: "Sobha", projects: "50+", active: "14 active", roi: "22%", delivery: "94%", famous: "Sobha Hartland" },
];

// 7-Step Process
const PROCESS_STEPS = [
  { step: 1, title: "Discovery Call", time: "Day 1", description: "Free 15-min consultation. Discuss budget, goals, crypto vs cash preference. Receive personalized project shortlist." },
  { step: 2, title: "Project Selection", time: "Days 2-7", description: "Site visits to shortlisted projects. View show apartments, check construction progress. Compare payment plans." },
  { step: 3, title: "Choose Payment", time: "Days 7-10", description: "Cash (AED/USD/EUR) or Crypto (BTC/USDT/ETH) via VARA-licensed gateway. Calculate total costs including DLD fees." },
  { step: 4, title: "Reserve Unit", time: "Days 10-14", description: "Sign Reservation Form, pay 5-10% deposit. Unit held exclusively for you. Deposit goes to DLD escrow." },
  { step: 5, title: "Sign SPA", time: "Days 14-21", description: "Review Sales & Purchase Agreement with legal team. Sign at DLD trustee office. Pay remaining down payment (total 10-20%)." },
  { step: 6, title: "Construction", time: "Months 1-30", description: "Installment payments every 3-6 months tied to milestones. Choose crypto or cash for each payment. Monthly progress reports." },
  { step: 7, title: "Handover", time: "Month 24-36", description: "Final payment or start post-handover plan. Receive keys and Title Deed. Apply for investor visa if eligible." },
];

// FAQ items (15 comprehensive questions)
const FAQ_ITEMS = [
  {
    question: "What is off-plan property in Dubai?",
    answer: "Off-plan property refers to real estate sold before or during construction, allowing buyers to purchase units at pre-completion prices typically 15-25% below market value. In Dubai, all payments are held in DLD-monitored escrow accounts and released to developers only upon verified construction milestones. As of December 2026, Dubai's off-plan market offers 8,548+ active projects with cryptocurrency and traditional payment options.",
  },
  {
    question: "Can I really buy Dubai property with cryptocurrency?",
    answer: "Yes! We facilitate cryptocurrency payments including Bitcoin (BTC), USDT (Tether), and Ethereum (ETH) through VARA-licensed gateways. Crypto converts instantly to AED at locked rates (24-48hr protection) and deposits directly into DLD-regulated escrow accounts. 22% of international off-plan purchases in 2024 used cryptocurrency, with USDT being most popular (64% of crypto transactions) due to price stability.",
  },
  {
    question: "How much do I need to buy off-plan property in Dubai 2026?",
    answer: "Entry prices start from AED 450,000 (~$122K USD) for studios in emerging communities like JVC, Dubai South, and Al Furjan. With 10-20% down payment structures, you can secure an off-plan unit with as little as AED 45,000-90,000 ($12,000-25,000 USD) initial deposit. The remaining balance spreads over 3-5 years during construction milestones.",
  },
  {
    question: "Is it safe to buy off-plan in Dubai?",
    answer: "Yes - Dubai's off-plan system is rated #1 globally for buyer protection (JLL Report 2024). Key protections: DLD escrow accounts hold all payments, only RERA-licensed developers can sell off-plan, independent engineers verify construction milestones before releasing funds, and if a project is canceled, buyers receive full refunds from escrow within 90 days.",
  },
  {
    question: "Can foreigners buy property in Dubai?",
    answer: "Absolutely. Foreigners can freely purchase freehold property in over 40 designated areas with identical rights to UAE citizens. No local sponsor required. Property purchases of AED 750K+ qualify for 2-year investor visas, and AED 2M+ qualifies for 10-year Golden Visas for the entire family.",
  },
  {
    question: "What is a post-handover payment plan?",
    answer: "Post-handover plans allow you to move into your completed property while continuing to pay installments over 3-5 years after handover. You can start living or earning rental income while spreading the final 20-40% of payments. Available in 68% of new launches from developers like DAMAC, Emaar, and Meraas.",
  },
  {
    question: "How long until handover?",
    answer: "Typical off-plan projects take 24-36 months from purchase to handover. Some late-stage projects offer 12-18 month timelines. We provide projects at various construction stages to match your investment timeline. Historical data shows off-plan investments deliver average 22% capital appreciation from purchase to handover.",
  },
  {
    question: "What additional costs are there beyond property price?",
    answer: "Additional costs include: 4% DLD registration fee (paid on handover), AED 2,000-5,000 trustee fee for SPA signing, AED 500-2,000 NOC fee, and potential service charges. Total approximately 5-7% of property value. For crypto payments, gateway fees are 0.5-2% (significantly lower than international wire fees of 3-5%).",
  },
  {
    question: "What ROI can I expect from Dubai off-plan?",
    answer: "Historical data shows 15-30% capital appreciation from purchase to handover (2-3 years), with rental yields of 6-9% annually post-handover. Example: Emaar Dubai Creek Harbour units purchased at launch (2019) are now worth 28% more at 2026 handover. JVC studios typically achieve 8-9% rental yields.",
  },
  {
    question: "Which developers are best for off-plan?",
    answer: "Top 5 developers by reliability: Emaar (95% on-time delivery, 24% avg ROI), Sobha (94% on-time, 22% ROI), Meraas (92% on-time, 23% ROI), Nakheel (91% on-time, 21% ROI), and DAMAC (88% on-time, 19% ROI but offers most flexible payment plans). All accept cryptocurrency payments through approved gateways.",
  },
  {
    question: "What are the best areas for off-plan investment in 2026?",
    answer: "Top performing areas: Business Bay (43 projects, from AED 950K, 7-8% yields), Dubai Creek Harbour (12 mega-projects, from AED 1.4M, 24% historical ROI), JVC (58 projects, from AED 650K, 8-9% yields), and Dubai South (34 projects, from AED 450K, highest growth potential near Expo City).",
  },
  {
    question: "How does the crypto payment process work step by step?",
    answer: "1) Select property and confirm price with our team. 2) Receive secure VARA-licensed gateway link with locked exchange rate (24-48hr protection). 3) Transfer BTC/USDT/ETH from your wallet to provided address. 4) Gateway instantly converts to AED. 5) AED deposits into DLD-regulated escrow. 6) Receive blockchain hash + gateway receipt + developer confirmation. Total process: 24-48 hours vs 5-7 days for international wire.",
  },
  {
    question: "Can I get a mortgage on off-plan property?",
    answer: "Yes, but with conditions. Most UAE banks offer mortgages on off-plan only when construction reaches 50%+ completion. Typical loan-to-value: 50% for off-plan (vs 80% for ready). Many investors use cash/crypto during construction, then refinance with mortgage on handover for the final 30-40% payment.",
  },
  {
    question: "What happens if the developer delays or fails?",
    answer: "Dubai's regulatory framework provides strong protection: All funds are held in escrow until construction milestones are verified. If a project is canceled, buyers receive full refunds from escrow within 90 days. RERA monitors all developers and can freeze projects or transfer them to other developers if issues arise. This is why Dubai is rated #1 globally for off-plan buyer protection.",
  },
  {
    question: "How do I qualify for a UAE Golden Visa through property?",
    answer: "Property investment of AED 2M+ qualifies for 10-year Golden Visa for you, spouse, and children. The property must be completed (not off-plan) to apply, but you can purchase off-plan and apply upon handover. Benefits include: no sponsor required, can live/work anywhere in UAE, and can be renewed indefinitely. Processing takes 2-4 weeks after handover.",
  },
];

// Interactive Lead Wizard Component
function LeadWizard({
  open,
  onOpenChange,
  t,
  isRTL,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: (key: string) => string;
  isRTL: boolean;
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    propertyType: "",
    budget: "",
    paymentMethod: "",
    name: "",
    email: "",
    phone: "",
    likedProjects: [] as string[],
    dislikedProjects: [] as string[],
    consentPrivacy: false,
    consentMarketing: false,
  });
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = 5;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!formData.consentPrivacy) return;
    if (!formData.email || !formData.name) {
      toast({ title: "Error", description: "Please fill in your name and email.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/leads/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          propertyType: formData.propertyType,
          budget: formData.budget,
          paymentMethod: formData.paymentMethod,
          preferredAreas: formData.likedProjects,
          consent: formData.consentPrivacy,
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit");
      }
      
      setSubmitted(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProjectSwipe = (liked: boolean) => {
    const project = TOP_AREAS[currentProjectIndex];
    if (liked) {
      setFormData(prev => ({ 
        ...prev, 
        likedProjects: [...prev.likedProjects, project.name] 
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        dislikedProjects: [...prev.dislikedProjects, project.name] 
      }));
    }
    
    if (currentProjectIndex < TOP_AREAS.length - 1) {
      setCurrentProjectIndex(currentProjectIndex + 1);
    } else {
      handleNext();
    }
  };

  const resetWizard = () => {
    setStep(1);
    setCurrentProjectIndex(0);
    setFormData({
      propertyType: "",
      budget: "",
      paymentMethod: "",
      name: "",
      email: "",
      phone: "",
      likedProjects: [],
      dislikedProjects: [],
      consentPrivacy: false,
      consentMarketing: false,
    });
    setSubmitted(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Off-Plan Property Lead Wizard</DialogTitle>
        {submitted ? (
          <div className="py-12 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Thank You!</h3>
            <p className="text-muted-foreground mb-2">
              An off-plan specialist will contact you within 24 hours.
            </p>
            {formData.likedProjects.length > 0 && (
              <p className="text-sm text-muted-foreground">
                We noted your interest in: {formData.likedProjects.join(", ")}
              </p>
            )}
            <Button className="mt-6" onClick={resetWizard}>
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="px-6 pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Property Type */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold">What type of property?</h3>
                      <p className="text-muted-foreground text-sm">Select your preferred property type</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {PROPERTY_TYPES.map((type) => {
                        const Icon = type.icon;
                        const isSelected = formData.propertyType === type.id;
                        return (
                          <button
                            key={type.id}
                            onClick={() => setFormData({ ...formData, propertyType: type.id })}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              isSelected 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover:border-primary/50"
                            }`}
                            data-testid={`option-property-${type.id}`}
                          >
                            <Icon className={`w-6 h-6 mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            <p className="font-medium">{type.label}</p>
                            <p className="text-xs text-muted-foreground">{type.price}</p>
                          </button>
                        );
                      })}
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      onClick={handleNext}
                      disabled={!formData.propertyType}
                      data-testid="button-wizard-next"
                    >
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 2: Budget */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold">What's your budget?</h3>
                      <p className="text-muted-foreground text-sm">Select your investment range</p>
                    </div>
                    <div className="space-y-3">
                      {BUDGET_RANGES.map((range) => {
                        const isSelected = formData.budget === range.id;
                        return (
                          <button
                            key={range.id}
                            onClick={() => setFormData({ ...formData, budget: range.id })}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                              isSelected 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover:border-primary/50"
                            }`}
                            data-testid={`option-budget-${range.id}`}
                          >
                            <p className="font-medium">{range.label}</p>
                            <p className="text-xs text-muted-foreground">{range.description}</p>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 mt-4">
                      <Button variant="outline" onClick={handleBack}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                      <Button 
                        className="flex-1" 
                        onClick={handleNext}
                        disabled={!formData.budget}
                      >
                        Continue <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Payment Method */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold">How do you prefer to pay?</h3>
                      <p className="text-muted-foreground text-sm">We accept crypto and cash</p>
                    </div>
                    <div className="space-y-3">
                      {PAYMENT_METHODS.map((method) => {
                        const Icon = method.icon;
                        const isSelected = formData.paymentMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-center gap-4 ${
                              isSelected 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover:border-primary/50"
                            }`}
                            data-testid={`option-payment-${method.id}`}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              isSelected ? "bg-primary/10" : "bg-muted"
                            }`}>
                              <Icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <div>
                              <p className="font-medium">{method.label}</p>
                              <p className="text-xs text-muted-foreground">{method.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 mt-4">
                      <Button variant="outline" onClick={handleBack}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                      <Button 
                        className="flex-1" 
                        onClick={handleNext}
                        disabled={!formData.paymentMethod}
                      >
                        Continue <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Swipe Projects */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold">Which projects interest you?</h3>
                      <p className="text-muted-foreground text-sm">
                        {currentProjectIndex + 1} of {TOP_AREAS.length} - Like or skip
                      </p>
                    </div>
                    
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentProjectIndex}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative"
                      >
                        <Card className="overflow-hidden">
                          <div className="relative h-48">
                            <img 
                              src={TOP_AREAS[currentProjectIndex].image}
                              alt={TOP_AREAS[currentProjectIndex].name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4 text-white">
                              <h4 className="font-bold text-lg">{TOP_AREAS[currentProjectIndex].name}</h4>
                              <p className="text-sm text-white/80">{TOP_AREAS[currentProjectIndex].developer}</p>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{TOP_AREAS[currentProjectIndex].type}</span>
                              <span className="font-medium">{TOP_AREAS[currentProjectIndex].price}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Handover: {TOP_AREAS[currentProjectIndex].handover}
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </AnimatePresence>

                    <div className="flex justify-center gap-6 pt-4">
                      <Button 
                        size="lg" 
                        variant="outline"
                        className="rounded-full w-16 h-16"
                        onClick={() => handleProjectSwipe(false)}
                        data-testid="button-swipe-skip"
                      >
                        <ThumbsDown className="w-6 h-6" />
                      </Button>
                      <Button 
                        size="lg" 
                        className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
                        onClick={() => handleProjectSwipe(true)}
                        data-testid="button-swipe-like"
                      >
                        <Heart className="w-6 h-6" />
                      </Button>
                    </div>

                    <div className="flex justify-center gap-1 mt-2">
                      {TOP_AREAS.map((_, idx) => (
                        <div 
                          key={idx}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            idx < currentProjectIndex 
                              ? formData.likedProjects.includes(TOP_AREAS[idx].name) 
                                ? "bg-green-500" 
                                : "bg-muted-foreground/30"
                              : idx === currentProjectIndex 
                                ? "bg-primary" 
                                : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>

                    <Button 
                      variant="ghost" 
                      className="w-full text-sm"
                      onClick={handleNext}
                    >
                      Skip all and continue
                    </Button>
                  </motion.div>
                )}

                {/* Step 5: Contact Details */}
                {step === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold">Almost there!</h3>
                      <p className="text-muted-foreground text-sm">Enter your details for personalized recommendations</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Full Name *</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            required
                            placeholder="Your full name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background"
                            data-testid="input-wizard-name"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Email *</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="email"
                            required
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background"
                            data-testid="input-wizard-email"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Phone (Optional)</label>
                        <input
                          type="tel"
                          placeholder="+971 50 123 4567"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg border bg-background"
                          data-testid="input-wizard-phone"
                        />
                      </div>

                      <div className="space-y-3 pt-2">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            required
                            checked={formData.consentPrivacy}
                            onChange={(e) => setFormData({ ...formData, consentPrivacy: e.target.checked })}
                            className="mt-1 w-4 h-4 rounded border-gray-300"
                            data-testid="checkbox-wizard-privacy"
                          />
                          <span className="text-xs text-muted-foreground">
                            I agree to the processing of my personal data. *
                          </span>
                        </label>
                        
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.consentMarketing}
                            onChange={(e) => setFormData({ ...formData, consentMarketing: e.target.checked })}
                            className="mt-1 w-4 h-4 rounded border-gray-300"
                            data-testid="checkbox-wizard-marketing"
                          />
                          <span className="text-xs text-muted-foreground">
                            I'd like to receive off-plan opportunities and market updates. (Optional)
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <Button variant="outline" onClick={handleBack}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                      <Button 
                        className="flex-1" 
                        onClick={handleSubmit}
                        disabled={!formData.name || !formData.email || !formData.consentPrivacy || isSubmitting}
                        data-testid="button-wizard-submit"
                      >
                        {isSubmitting ? "Submitting..." : "Get My Recommendations"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function PublicOffPlan() {
  const { t, isRTL, localePath } = useLocale();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showFullIntro, setShowFullIntro] = useState(false);

  useDocumentMeta({
    title: t("offPlan.metaTitle"),
    description: t("offPlan.metaDescription"),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <PublicNav />
      <LeadWizard open={wizardOpen} onOpenChange={setWizardOpen} t={t} isRTL={isRTL} />

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&h=1080&fit=crop"
            alt="Dubai off-plan property development under construction with modern architecture and skyline"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm mb-6 text-sm px-4 py-1.5">
            {t("offPlan.poweredBy")}
          </Badge>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4 tracking-tight">
            {t("offPlan.heroTitle")}
          </h1>

          <h2 className="text-xl sm:text-2xl md:text-3xl text-white/90 mb-6 font-light max-w-3xl mx-auto">
            {t("offPlan.heroSubtitle")}
          </h2>

          <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
            <Badge variant="outline" className="bg-white/10 text-white border-white/30 backdrop-blur-sm px-4 py-2">
              <Banknote className={`w-4 h-4 ${isRTL ? "ml-2" : "mr-2"}`} /> {t("offPlan.paymentCash")}
            </Badge>
            <Badge variant="outline" className="bg-white/10 text-white border-white/30 backdrop-blur-sm px-4 py-2">
              <CreditCard className={`w-4 h-4 ${isRTL ? "ml-2" : "mr-2"}`} /> {t("offPlan.paymentBankTransfer")}
            </Badge>
            <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30 backdrop-blur-sm px-4 py-2">
              <Bitcoin className={`w-4 h-4 ${isRTL ? "ml-2" : "mr-2"}`} /> {t("offPlan.paymentCrypto")}
            </Badge>
          </div>
          
          <Button
            size="lg"
            className="text-lg px-8 py-6 rounded-full shadow-2xl"
            onClick={() => setWizardOpen(true)}
            data-testid="button-hero-wizard"
          >
            <Building2 className={`w-5 h-5 ${isRTL ? "ml-2" : "mr-2"}`} />
            {t("offPlan.findProperty")}
          </Button>

          <div className="flex flex-wrap justify-center gap-4 mt-8 text-white/80 text-sm">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              {t("offPlan.fromPrice")}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              {t("offPlan.paymentYears")}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              {t("offPlan.cryptoAccepted")}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              {t("offPlan.capitalGains")}
            </span>
          </div>
        </div>
        
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-white/60" />
        </div>
      </section>

      {/* Quick Info Bar */}
      <section className="bg-primary text-primary-foreground py-4 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-6 md:gap-10 overflow-x-auto no-scrollbar">
            {QUICK_INFO.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-2 shrink-0">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sub-Navigation Menu */}
      <section className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="py-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 min-w-max">
              {/* Main Sections */}
              <Link href="/destinations/dubai/off-plan/investment-guide">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-investment-guide">
                  Investment Guide
                </Button>
              </Link>
              <Link href="/destinations/dubai/off-plan/how-to-buy">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-how-to-buy">
                  How to Buy
                </Button>
              </Link>
              <Link href="/destinations/dubai/off-plan/payment-plans">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-payment-plans">
                  Payment Plans
                </Button>
              </Link>
              <Link href="/destinations/dubai/off-plan/best-projects-2026">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-best-2026">
                  Best 2026
                </Button>
              </Link>
              
              <div className="w-px h-5 bg-border mx-1" />
              
              {/* Calculators */}
              <Link href="/destinations/dubai/tools/roi-calculator">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-roi-calc">
                  ROI Calculator
                </Button>
              </Link>
              <Link href="/destinations/dubai/tools/payment-calculator">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-payment-calc">
                  Payment Calc
                </Button>
              </Link>
              <Link href="/destinations/dubai/tools/affordability-calculator">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-afford-calc">
                  Affordability
                </Button>
              </Link>
              <Link href="/destinations/dubai/tools/mortgage-calculator">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-mortgage-calc">
                  Mortgage
                </Button>
              </Link>
              
              <div className="w-px h-5 bg-border mx-1" />
              
              {/* Comparisons */}
              <Link href="/destinations/dubai/compare/off-plan-vs-ready">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-compare-offplan-ready">
                  Off-Plan vs Ready
                </Button>
              </Link>
              <Link href="/destinations/dubai/compare/emaar-vs-damac">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-compare-emaar-damac">
                  Emaar vs DAMAC
                </Button>
              </Link>
              <Link href="/destinations/dubai/compare/crypto-vs-bank">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-compare-crypto-bank">
                  Crypto vs Bank
                </Button>
              </Link>
              
              <div className="w-px h-5 bg-border mx-1" />
              
              {/* Case Studies & Glossary */}
              <Link href="/destinations/dubai/case-studies/jvc-investor">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-case-jvc">
                  Case Studies
                </Button>
              </Link>
              <Link href="/glossary">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-glossary">
                  Glossary
                </Button>
              </Link>
              <Link href="/destinations/dubai/roi-rental-yields">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-roi-yields">
                  ROI Guide
                </Button>
              </Link>
              <Link href="/destinations/dubai/legal-security-guide">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="subnav-legal">
                  Legal Guide
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* ===== 2024 MARKET OVERVIEW STATS SECTION ===== */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">2024 Record Year</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="heading-market-overview">Dubai Real Estate Market Overview</h2>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
                Dubai's property market surpassed all records in 2024, with the ValuStrat Price Index doubling since January 2021.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
              {MARKET_STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="p-5 text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>
                    <div className="w-12 h-12 rounded-full bg-[#6443F4]/10 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-6 h-6 text-[#6443F4]" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-[#6443F4]">{stat.value}</p>
                    <p className="text-sm font-medium mt-1">{stat.label}</p>
                    <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                  </Card>
                );
              })}
            </div>
            
            <p className="text-center text-sm text-muted-foreground mt-8">
              Source: Dubai Land Department, ValuStrat, Knight Frank Dubai 2024
            </p>
          </div>
        </section>

        {/* ===== TOP AGENCIES SECTION ===== */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="heading-top-agencies">Tier 1 Real Estate Agencies</h2>
              <p className="text-muted-foreground text-lg">Industry leaders serving 110,000 new investors in 2024</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {TOP_AGENCIES.map((agency, index) => (
                <Card key={agency.name} className="p-5" data-testid={`card-agency-${index}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{agency.name}</h3>
                      <p className="text-sm text-muted-foreground">Est. {agency.founded}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{agency.agents} agents</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{agency.specialty}</p>
                  <div className="pt-3 border-t">
                    <p className="text-xs text-[#6443F4] font-medium">{agency.achievement}</p>
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="mt-8 p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                Off-Plan Leaders: fäm Properties, H&S Real Estate, Sky View Real Estate | 
                Luxury Segment (AED 10M+): 4,600+ units transacted in 2024 (+23% YoY)
              </p>
            </div>
          </div>
        </section>

        {/* ===== EXPANDED DEVELOPERS SECTION ===== */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="heading-developers">Major Developer Ecosystem</h2>
              <p className="text-muted-foreground text-lg">From market leaders to emerging specialists</p>
            </div>
            
            {/* Tier 1 Developers */}
            <div className="mb-12">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Badge className="bg-[#6443F4]">Tier 1</Badge>
                Market Leaders
              </h3>
              
              <div className="space-y-4">
                {EXPANDED_DEVELOPERS.map((dev, index) => (
                  <Card key={dev.name} className="p-6" data-testid={`card-developer-${index}`}>
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      <div className="lg:w-1/4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-[#6443F4] flex items-center justify-center text-white font-bold text-lg">
                            {dev.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">{dev.name}</h4>
                            {dev.quality && (
                              <div className="flex gap-0.5">
                                {Array.from({ length: dev.quality }).map((_, i) => (
                                  <span key={i} className="text-amber-500 text-xs">★</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {dev.onTimeRate && (
                          <Badge variant="outline" className="text-xs">{dev.onTimeRate} on-time</Badge>
                        )}
                      </div>
                      
                      <div className="lg:w-3/4 grid md:grid-cols-2 gap-4 text-sm">
                        {dev.unitsDelivered && (
                          <div>
                            <span className="text-muted-foreground">Units Delivered:</span>
                            <span className="ml-2 font-medium">{dev.unitsDelivered}</span>
                          </div>
                        )}
                        {dev.marketCap && (
                          <div>
                            <span className="text-muted-foreground">Market Cap:</span>
                            <span className="ml-2 font-medium">{dev.marketCap}</span>
                          </div>
                        )}
                        {dev.landReserve && (
                          <div>
                            <span className="text-muted-foreground">Land Reserve:</span>
                            <span className="ml-2 font-medium">{dev.landReserve}</span>
                          </div>
                        )}
                        {dev.investment && (
                          <div>
                            <span className="text-muted-foreground">Investment:</span>
                            <span className="ml-2 font-medium">{dev.investment}</span>
                          </div>
                        )}
                        {dev.pipeline && (
                          <div>
                            <span className="text-muted-foreground">Pipeline:</span>
                            <span className="ml-2 font-medium">{dev.pipeline}</span>
                          </div>
                        )}
                        {dev.masterCommunities && (
                          <div>
                            <span className="text-muted-foreground">Communities:</span>
                            <span className="ml-2 font-medium">{dev.masterCommunities}</span>
                          </div>
                        )}
                        {dev.partnerships && (
                          <div className="md:col-span-2">
                            <span className="text-muted-foreground">Partnerships:</span>
                            <span className="ml-2 font-medium">{dev.partnerships}</span>
                          </div>
                        )}
                        {dev.flagships && (
                          <div className="md:col-span-2">
                            <span className="text-muted-foreground">Flagships:</span>
                            <span className="ml-2 font-medium">{dev.flagships}</span>
                          </div>
                        )}
                        {dev.flagship && (
                          <div className="md:col-span-2">
                            <span className="text-muted-foreground">Flagship:</span>
                            <span className="ml-2 font-medium">{dev.flagship}</span>
                          </div>
                        )}
                        {dev.differentiator && (
                          <div className="md:col-span-2">
                            <span className="text-muted-foreground">Differentiator:</span>
                            <span className="ml-2 font-medium">{dev.differentiator}</span>
                          </div>
                        )}
                        {dev.priceRange && (
                          <div className="md:col-span-2">
                            <span className="text-muted-foreground">Prices:</span>
                            <span className="ml-2 font-medium text-[#6443F4]">{dev.priceRange}</span>
                          </div>
                        )}
                        {dev.paymentPlans && (
                          <div className="md:col-span-2">
                            <span className="text-muted-foreground">Payment Plans:</span>
                            <span className="ml-2 font-medium">{dev.paymentPlans}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            
            {/* Tier 2 Developers */}
            <div>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Badge variant="outline">Tier 2</Badge>
                Value & Emerging Developers
              </h3>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TIER2_DEVELOPERS.map((dev, index) => (
                  <Card key={dev.name} className="p-5" data-testid={`card-tier2-dev-${index}`}>
                    <h4 className="font-bold mb-2">{dev.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{dev.stats}</p>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-sm font-medium text-[#6443F4]">{dev.startingPrice}</span>
                      <Badge variant="secondary" className="text-xs">{dev.paymentPlan}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== AREA ANALYSIS SECTION ===== */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="heading-area-analysis">Area Analysis & Investment Yields</h2>
              <p className="text-muted-foreground text-lg">Comprehensive pricing and yield data by location</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-area-analysis">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-semibold">Area</th>
                    <th className="text-left p-4 font-semibold">Category</th>
                    <th className="text-left p-4 font-semibold">Price/sqft</th>
                    <th className="text-left p-4 font-semibold">Rental Yield</th>
                    <th className="text-left p-4 font-semibold">Entry Price</th>
                    <th className="text-left p-4 font-semibold">Best For</th>
                  </tr>
                </thead>
                <tbody>
                  {AREA_ANALYSIS.map((area, index) => (
                    <tr key={area.area} className={`border-b ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`} data-testid={`row-area-${index}`}>
                      <td className="p-4 font-medium">{area.area}</td>
                      <td className="p-4">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            area.category.includes('Premium') ? 'border-amber-500 text-amber-600' :
                            area.category.includes('High-Yield') ? 'border-green-500 text-green-600' :
                            area.category.includes('Emerging') ? 'border-[#6443F4] text-[#6443F4]' :
                            ''
                          }`}
                        >
                          {area.category}
                        </Badge>
                      </td>
                      <td className="p-4">{area.pricePerSqft}</td>
                      <td className="p-4 font-semibold text-green-600">{area.rentalYield}</td>
                      <td className="p-4 text-[#6443F4] font-medium">{area.entryPrice}</td>
                      <td className="p-4 text-muted-foreground text-xs">{area.bestFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-8 grid md:grid-cols-3 gap-4">
              <Card className="p-5 border-green-500/30 bg-green-50/50 dark:bg-green-900/10">
                <h4 className="font-bold text-green-700 dark:text-green-400 mb-2">Highest Yields</h4>
                <ul className="text-sm space-y-1">
                  <li>Discovery Gardens: 9-9.8%</li>
                  <li>Dubai Silicon Oasis: 7.7-9.8%</li>
                  <li>Dubai South: 7.5-9.5%</li>
                </ul>
              </Card>
              <Card className="p-5 border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10">
                <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-2">Best Appreciation</h4>
                <ul className="text-sm space-y-1">
                  <li>Jumeirah Islands: +42.5%</li>
                  <li>Palm Jumeirah: +42.3%</li>
                  <li>Emirates Hills: +32.3%</li>
                </ul>
              </Card>
              <Card className="p-5 border-[#6443F4]/30 bg-[#6443F4]/5 dark:bg-[#6443F4]/10">
                <h4 className="font-bold text-[#6443F4] mb-2">Lowest Entry</h4>
                <ul className="text-sm space-y-1">
                  <li>International City: AED 310K</li>
                  <li>Discovery Gardens: AED 350K</li>
                  <li>JVC: AED 400K</li>
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* ===== PAYMENT PLANS COMPARISON ===== */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="heading-payment-plans">Payment Plan Comparison</h2>
              <p className="text-muted-foreground text-lg">Developer payment structures for off-plan purchases</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PAYMENT_PLANS.map((plan, index) => (
                <Card 
                  key={plan.type} 
                  className={`p-5 ${plan.highlight ? 'border-[#6443F4] bg-[#6443F4]/5' : ''}`}
                  data-testid={`card-payment-plan-${index}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-lg">{plan.type}</h4>
                    {plan.highlight && <Badge className="bg-[#6443F4]">Popular</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{plan.structure}</p>
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground">Offered by:</p>
                    <p className="text-sm font-medium">{plan.developers}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ===== GOLDEN VISA SECTION ===== */}
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">UAE Golden Visa</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="heading-golden-visa">Golden Visa Through Real Estate</h2>
              <p className="text-muted-foreground text-lg">10-year renewable residence for property investors</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-6">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                  <BadgeCheck className="w-6 h-6 text-amber-500" />
                  Requirements
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Minimum Investment</p>
                      <p className="text-sm text-muted-foreground">{GOLDEN_VISA_INFO.minimumInvestment}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Property Type</p>
                      <p className="text-sm text-muted-foreground">{GOLDEN_VISA_INFO.propertyType}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Multiple Properties</p>
                      <p className="text-sm text-muted-foreground">Can combine properties to reach threshold</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Off-Plan Accepted</p>
                      <p className="text-sm text-muted-foreground">{GOLDEN_VISA_INFO.offPlanAccepted}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Mortgage Eligible</p>
                      <p className="text-sm text-muted-foreground">{GOLDEN_VISA_INFO.mortgageEligible}</p>
                    </div>
                  </li>
                </ul>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-900/10">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                  Benefits
                </h3>
                <ul className="space-y-4 mb-6">
                  {GOLDEN_VISA_INFO.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{GOLDEN_VISA_INFO.familySponsorship}</span>
                  </li>
                </ul>
                
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{GOLDEN_VISA_INFO.duration}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processing:</span>
                    <span className="font-medium">{GOLDEN_VISA_INFO.processing}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-medium">{GOLDEN_VISA_INFO.cost}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ===== HISTORICAL PRICE GROWTH ===== */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="heading-price-history">Historical Price Growth</h2>
              <p className="text-muted-foreground text-lg">Market-wide appreciation from 2021 to 2025</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Price History Table */}
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4">Average Price/sqft (AED)</h3>
                <div className="space-y-3">
                  {PRICE_HISTORY.map((row, index) => (
                    <div 
                      key={row.year}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      data-testid={`row-price-history-${index}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-lg">{row.year}</span>
                        <span className="text-xl font-bold text-[#6443F4]">AED {row.avgPrice}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">{row.yoyChange}</p>
                        <p className="text-xs text-muted-foreground">{row.cumulative}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-center mt-6 text-2xl font-bold text-green-600">+120% Total Growth</p>
              </Card>
              
              {/* Top Performers */}
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Home className="w-5 h-5 text-[#6443F4]" />
                    Top Villa Performers 2024
                  </h3>
                  <div className="space-y-3">
                    {TOP_PERFORMERS.villas.map((item, index) => (
                      <div key={item.area} className="flex justify-between items-center" data-testid={`row-top-villa-${index}`}>
                        <span>{item.area}</span>
                        <Badge className="bg-green-600">{item.growth}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
                
                <Card className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#6443F4]" />
                    Top Apartment Performers 2024
                  </h3>
                  <div className="space-y-3">
                    {TOP_PERFORMERS.apartments.map((item, index) => (
                      <div key={item.area} className="flex justify-between items-center" data-testid={`row-top-apt-${index}`}>
                        <span>{item.area}</span>
                        <Badge className="bg-green-600">{item.growth}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
                
                <Card className="p-5 bg-[#6443F4]/10">
                  <p className="text-center">
                    <span className="text-muted-foreground">2025 Forecast:</span>
                    <span className="font-bold ml-2">+5-10% Price Growth</span>
                    <span className="mx-2">|</span>
                    <span className="font-bold">+10-18% Rental Growth</span>
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Brief Intro */}
        <section className="py-16 md:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-lg md:text-xl text-foreground/90 leading-relaxed">
              Off-plan properties in Dubai offer investors the opportunity to purchase under-construction developments at 15-25% below completed market value, with flexible payment plans spreading costs over 3-5 years tied to construction milestones. Our specialists secure pre-launch allocations from top developers including Emaar, Damac, Meraas, Nakheel, and Sobha, with cryptocurrency and cash payment options accepted.
            </p>
            
            {showFullIntro && (
              <div className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed animate-in fade-in duration-300 text-left">
                <p className="mb-4">
                  Dubai's off-plan market has matured significantly since 2020, with stricter developer regulations by Dubai Land Department (DLD) and Real Estate Regulatory Agency (RERA) ensuring buyer protection through escrow accounts and transparent construction timelines. All payments are held in DLD-monitored escrow accounts and released to developers only upon verified construction milestones.
                </p>
                <p className="mb-4">
                  In December 2026, Dubai's off-plan market offers exceptional opportunities driven by Expo City Dubai's ongoing expansion, Dubai Creek Harbour mega-development, and Mohammed bin Rashid City entering final phases. Top developers now offer post-handover payment plans allowing buyers to move into completed units while continuing to pay installments.
                </p>
                <p>
                  Studios start AED 450K (Damac Lagoons, Dubai South), 1-bedroom apartments from AED 700K (JVC, Dubai Sports City), 2-bedroom apartments from AED 1.1M (Business Bay, Dubai Hills Estate), 3-bedroom townhouses from AED 1.8M (Damac Hills 2, Arabian Ranches 3), and luxury villas from AED 3M+ (MBR City, Tilal Al Ghaf).
                </p>
              </div>
            )}
            
            <Button 
              variant="ghost" 
              className="mt-6"
              onClick={() => setShowFullIntro(!showFullIntro)}
              data-testid="button-toggle-intro"
            >
              {showFullIntro ? "Show Less" : "Read More About Off-Plan Investment"}
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFullIntro ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </section>

        {/* Payment Methods Section */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Flexible Payment Methods</h2>
              <p className="text-muted-foreground text-lg">Choose how you want to invest</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Cash Payment */}
              <Card className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Banknote className="w-7 h-7 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">Cash & Bank Transfer</h3>
                    <p className="text-muted-foreground text-sm">Traditional payment methods</p>
                  </div>
                </div>
                <ul className="space-y-2 mb-6">
                  {["AED, USD, EUR, GBP accepted", "Direct bank transfer to escrow", "Cheque payments (UAE banks)", "Wire transfer (SWIFT/IBAN)", "No conversion fees"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setWizardOpen(true)}
                  data-testid="button-inquire-cash"
                >
                  Inquire About Cash Payment
                </Button>
              </Card>

              {/* Crypto Payment */}
              <Card className="p-6 border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-900/10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Bitcoin className="w-7 h-7 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">Cryptocurrency</h3>
                    <p className="text-muted-foreground text-sm">Fast, global, secure</p>
                  </div>
                </div>
                <ul className="space-y-2 mb-6">
                  {["Bitcoin (BTC) accepted", "USDT (Tether) accepted", "Ethereum (ETH) accepted", "Instant conversion to AED", "VARA-licensed gateway", "Perfect for international investors"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  onClick={() => setWizardOpen(true)}
                  data-testid="button-inquire-crypto"
                >
                  <Bitcoin className="w-4 h-4 mr-2" />
                  Inquire About Crypto Payment
                </Button>
              </Card>
            </div>

            {/* Security notice */}
            <div className="mt-8 p-4 rounded-lg bg-background border flex items-start gap-4">
              <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Security & Compliance</p>
                <p className="text-xs text-muted-foreground">
                  All payments (crypto & cash) go directly to DLD-regulated escrow accounts. Full VARA (Virtual Asset Regulatory Authority) compliance for cryptocurrency transactions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Off-Plan - 8 Benefits */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">8 Reasons Off-Plan Outperforms Ready Property</h2>
              <p className="text-muted-foreground text-lg">Data-backed advantages for investors</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {OFF_PLAN_ADVANTAGES.map((advantage) => {
                const Icon = advantage.icon;
                return (
                  <Card key={advantage.title} className="p-5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold mb-2">{advantage.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{advantage.description}</p>
                    <p className="text-xs text-primary/70 italic">{advantage.source}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Info Grid */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">At a Glance</h2>
              <p className="text-muted-foreground text-lg">Essential off-plan information</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: DollarSign, title: "Entry Price", value: "AED 450K", sub: "Crypto & Cash OK" },
                { icon: CalendarDays, title: "Payment", value: "10-20%", sub: "Down, pay over 3-5 years" },
                { icon: TrendingUp, title: "Returns", value: "15-30%", sub: "Capital gains potential" },
                { icon: Clock, title: "Handover", value: "2026-2028", sub: "Varies by project" },
                { icon: Bitcoin, title: "Crypto", value: "BTC/USDT/ETH", sub: "Accepted at all milestones" },
                { icon: Building2, title: "Developers", value: "Emaar, Damac", sub: "Meraas, Nakheel, Sobha" },
                { icon: Shield, title: "Security", value: "DLD Escrow", sub: "VARA compliant" },
                { icon: Zap, title: "Timeline", value: "24-36 mo", sub: "Pre-launch to handover" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.title} className="p-5 text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{item.title}</p>
                    <p className="text-xl font-bold text-primary">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* 7-Step Process */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Off-Plan Journey</h2>
              <p className="text-muted-foreground text-lg">7 steps from discovery to handover</p>
            </div>
            
            <div className="relative">
              <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-border" />
              <div className="grid md:grid-cols-7 gap-4">
                {PROCESS_STEPS.map((step) => (
                  <div key={step.step} className="relative">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4 relative z-10">
                        {step.step}
                      </div>
                      <h3 className="font-bold text-sm mb-1">{step.title}</h3>
                      <p className="text-xs text-primary font-medium mb-2">{step.time}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-center mt-10">
              <Button onClick={() => setWizardOpen(true)} data-testid="button-start-journey">
                Start Your Journey Today
              </Button>
            </div>
          </div>
        </section>

        {/* 12 Hot Projects */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">12 Exclusive Pre-Launch Projects</h2>
              <p className="text-muted-foreground text-lg">December 2026 | All accept crypto payment</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {TOP_AREAS.map((area) => (
                <Card key={area.name} className="overflow-hidden group">
                  <div className="relative h-40">
                    <img 
                      src={area.image}
                      alt={area.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute top-3 right-3 flex gap-1">
                      <Badge className="bg-green-600/90 text-xs">{area.roi} ROI</Badge>
                      <Badge className="bg-amber-500/90 text-xs">
                        <Bitcoin className="w-3 h-3" />
                      </Badge>
                    </div>
                    <div className="absolute bottom-3 left-3 text-white">
                      <p className="text-xs text-white/70">{area.developer}</p>
                      <h3 className="font-bold text-sm leading-tight">{area.name}</h3>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted-foreground">{area.type}</span>
                      <Badge variant="outline" className="text-xs">{area.handover}</Badge>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <p className="font-semibold text-primary text-sm">{area.price}</p>
                      <span className="text-xs text-muted-foreground">{area.plan}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setWizardOpen(true)}
                    >
                      Pre-Launch Access
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Developers */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Top 5 Off-Plan Developers</h2>
              <p className="text-muted-foreground text-lg">2026 Rankings | All accept crypto payments</p>
            </div>
            
            <div className="grid md:grid-cols-5 gap-4">
              {DEVELOPERS.map((dev, index) => (
                <Card key={dev.name} className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <h3 className="font-bold">{dev.name}</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-medium">{dev.projects}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active</span>
                      <span className="font-medium">{dev.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg ROI</span>
                      <span className="font-medium text-green-600">{dev.roi}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">On-time</span>
                      <span className="font-medium">{dev.delivery}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">{dev.famous}</p>
                </Card>
              ))}
            </div>
            
            <div className="text-center mt-8">
              <p className="text-sm text-muted-foreground mb-4">All developers: RERA-licensed, DLD-compliant, crypto payments via VARA-licensed gateways</p>
              <Button onClick={() => setWizardOpen(true)} data-testid="button-discuss-developers">
                Discuss Developer Options
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground text-lg">Everything you need to know</p>
            </div>
            
            <Accordion type="single" collapsible className="space-y-3">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-card border rounded-lg px-4"
                >
                  <AccordionTrigger className="text-left font-medium py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Resources Hub - Links to all tools, comparisons, case studies */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Investment Resources</h2>
              <p className="text-muted-foreground text-lg">Free tools, guides, and real success stories</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Calculator Tools */}
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-bold">Calculator Tools</h3>
                </div>
                <ul className="space-y-2">
                  <li><Link href="/destinations/dubai/tools/roi-calculator" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-tool-roi">ROI Calculator</Link></li>
                  <li><Link href="/destinations/dubai/tools/payment-calculator" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-tool-payment">Payment Plan Calculator</Link></li>
                  <li><Link href="/destinations/dubai/tools/affordability-calculator" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-tool-affordability">Affordability Calculator</Link></li>
                  <li><Link href="/tools-currency-converter" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-tool-currency">Currency Converter</Link></li>
                  <li><Link href="/tools-fees-calculator" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-tool-fees">Fees Calculator</Link></li>
                  <li><Link href="/tools-rental-yield-calculator" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-tool-rental">Rental Yield Calculator</Link></li>
                  <li><Link href="/destinations/dubai/tools/mortgage-calculator" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-tool-mortgage">Mortgage Calculator</Link></li>
                </ul>
              </Card>

              {/* Comparison Guides */}
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-[#6443F4]" />
                  </div>
                  <h3 className="font-bold">Comparison Guides</h3>
                </div>
                <ul className="space-y-2">
                  <li><Link href="/destinations/dubai/compare/off-plan-vs-ready" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-compare-offplan-ready">Off-Plan vs Ready</Link></li>
                  <li><Link href="/compare-jvc-vs-dubai-south" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-compare-jvc-south">JVC vs Dubai South</Link></li>
                  <li><Link href="/destinations/dubai/compare/emaar-vs-damac" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-compare-emaar-damac">Emaar vs DAMAC</Link></li>
                  <li><Link href="/compare-downtown-vs-marina" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-compare-downtown-marina">Downtown vs Marina</Link></li>
                  <li><Link href="/destinations/dubai/compare/crypto-vs-bank" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-compare-crypto-bank">Crypto vs Bank Payment</Link></li>
                  <li><Link href="/compare-villa-vs-apartment" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-compare-villa-apt">Villa vs Apartment</Link></li>
                  <li><Link href="/compare-studio-vs-1bed" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-compare-studio-1bed">Studio vs 1-Bedroom</Link></li>
                  <li><Link href="/glossary" className="text-sm text-primary hover:underline transition-colors block font-medium" data-testid="link-glossary">View All Terms</Link></li>
                </ul>
              </Card>

              {/* Case Studies */}
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-bold">Investor Case Studies</h3>
                </div>
                <ul className="space-y-2">
                  <li><Link href="/destinations/dubai/case-studies/jvc-investor" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-case-jvc">JVC Studio Investor</Link></li>
                  <li><Link href="/case-study-crypto-buyer" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-case-crypto">Crypto Buyer Success</Link></li>
                  <li><Link href="/case-study-golden-visa" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-case-goldenvisa">Golden Visa Journey</Link></li>
                  <li><Link href="/case-study-expat-family" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-case-expat">Expat Family Home</Link></li>
                  <li><Link href="/case-study-investor-flip" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-case-flip">Investor Flip Strategy</Link></li>
                  <li><Link href="/case-study-portfolio-diversification" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-case-portfolio">Portfolio Diversification</Link></li>
                  <li><Link href="/case-study-off-plan-launch" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-case-launch">Off-Plan Launch Day</Link></li>
                  <li><Link href="/case-study-retirement-planning" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-case-retirement">Retirement Planning</Link></li>
                </ul>
              </Card>

              {/* Guides & Glossary */}
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="font-bold">Guides & Resources</h3>
                </div>
                <ul className="space-y-2">
                  <li><Link href="/destinations/dubai/off-plan/investment-guide" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-guide-investment">Investment Guide</Link></li>
                  <li><Link href="/destinations/dubai/off-plan/how-to-buy" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-guide-howtobuy">How to Buy Off-Plan</Link></li>
                  <li><Link href="/destinations/dubai/off-plan/payment-plans" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-guide-payment">Payment Plan Guide</Link></li>
                  <li><Link href="/destinations/dubai/off-plan/best-projects-2026" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-guide-best2026">Best Projects 2026</Link></li>
                  <li><Link href="/destinations/dubai/roi-rental-yields" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-guide-roi">ROI & Yields Guide</Link></li>
                  <li><Link href="/destinations/dubai/legal-security-guide" className="text-sm text-muted-foreground hover:text-foreground transition-colors block" data-testid="link-guide-legal">Legal & Security Guide</Link></li>
                  <li><Link href="/glossary" className="text-sm text-primary hover:underline transition-colors block font-medium" data-testid="link-glossary-main">Glossary (25+ Terms)</Link></li>
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Invest in Dubai Off-Plan?</h2>
            <p className="text-lg text-primary-foreground/80 mb-8">
              Get personalized recommendations from our off-plan specialists. Pay with crypto or cash.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6 rounded-full"
              onClick={() => setWizardOpen(true)}
              data-testid="button-final-cta"
            >
              <Building2 className="w-5 h-5 mr-2" />
              Start Your Off-Plan Journey
            </Button>
            <div className="flex items-center justify-center gap-4 mt-6 text-sm text-primary-foreground/70">
              <span className="flex items-center gap-1.5">
                <Bitcoin className="w-4 h-4" /> BTC/USDT/ETH
              </span>
              <span className="flex items-center gap-1.5">
                <Banknote className="w-4 h-4" /> Cash/Bank Transfer
              </span>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
      <LiveEditToggle pageSlug="off-plan" />
    </div>
  );
}
