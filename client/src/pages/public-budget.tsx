import { Link } from "wouter";
import { ArrowLeft, Calculator, Hotel, Utensils, Car, Ticket, Plus, Minus, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

const hotelOptions = [
  { id: "budget", name: "Budget", pricePerNight: 150, desc: "3-star hotels, comfortable stays" },
  { id: "midrange", name: "Mid-Range", pricePerNight: 350, desc: "4-star hotels, great amenities" },
  { id: "luxury", name: "Luxury", pricePerNight: 800, desc: "5-star resorts, premium experience" },
  { id: "ultra", name: "Ultra Luxury", pricePerNight: 2000, desc: "World-class suites, exclusive service" },
];

const diningOptions = [
  { id: "budget", name: "Budget", pricePerDay: 50, desc: "Street food & casual dining" },
  { id: "moderate", name: "Moderate", pricePerDay: 120, desc: "Nice restaurants, varied cuisine" },
  { id: "premium", name: "Premium", pricePerDay: 250, desc: "Fine dining experiences" },
];

const transportOptions = [
  { id: "public", name: "Public Transport", pricePerDay: 15, desc: "Metro, bus, tram" },
  { id: "taxi", name: "Taxis/Rideshare", pricePerDay: 80, desc: "Uber, Careem, Dubai Taxi" },
  { id: "rental", name: "Car Rental", pricePerDay: 150, desc: "Freedom to explore" },
  { id: "chauffeur", name: "Private Driver", pricePerDay: 400, desc: "Luxury chauffeur service" },
];

const activities = [
  { id: "burj", name: "Burj Khalifa At The Top", price: 180 },
  { id: "safari", name: "Desert Safari", price: 80 },
  { id: "aquarium", name: "Dubai Aquarium", price: 60 },
  { id: "dhow", name: "Dhow Cruise Dinner", price: 90 },
  { id: "museum", name: "Museum of the Future", price: 150 },
  { id: "palm", name: "Palm Jumeirah Tour", price: 100 },
  { id: "gold", name: "Gold Souk Tour", price: 0 },
  { id: "miracle", name: "Miracle Garden", price: 55 },
];

const currencies: Record<string, { symbol: string; rate: number }> = {
  AED: { symbol: "د.إ", rate: 1 },
  USD: { symbol: "$", rate: 0.2723 },
  EUR: { symbol: "€", rate: 0.2519 },
  GBP: { symbol: "£", rate: 0.2165 },
  ILS: { symbol: "₪", rate: 1.0000 },
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function PublicBudget() {
  const [days, setDays] = useState(5);
  const [travelers, setTravelers] = useState(2);
  const [hotelType, setHotelType] = useState("midrange");
  const [diningType, setDiningType] = useState("moderate");
  const [transportType, setTransportType] = useState("taxi");
  const [selectedActivities, setSelectedActivities] = useState<string[]>(["burj", "safari"]);
  const [displayCurrency, setDisplayCurrency] = useState("AED");
  const [total, setTotal] = useState(0);

  const toggleActivity = (id: string) => {
    setSelectedActivities(prev => 
      prev.includes(id) 
        ? prev.filter(a => a !== id)
        : [...prev, id]
    );
  };

  useEffect(() => {
    const hotel = hotelOptions.find(h => h.id === hotelType);
    const dining = diningOptions.find(d => d.id === diningType);
    const transport = transportOptions.find(t => t.id === transportType);
    
    const hotelCost = (hotel?.pricePerNight || 0) * days;
    const diningCost = (dining?.pricePerDay || 0) * days * travelers;
    const transportCost = (transport?.pricePerDay || 0) * days;
    const activitiesCost = selectedActivities.reduce((sum, actId) => {
      const activity = activities.find(a => a.id === actId);
      return sum + ((activity?.price || 0) * travelers);
    }, 0);

    setTotal(hotelCost + diningCost + transportCost + activitiesCost);
  }, [days, travelers, hotelType, diningType, transportType, selectedActivities]);

  const formatPrice = (aedAmount: number) => {
    const { symbol, rate } = currencies[displayCurrency];
    const converted = aedAmount * rate;
    return `${symbol}${converted.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const hotel = hotelOptions.find(h => h.id === hotelType);
  const dining = diningOptions.find(d => d.id === diningType);
  const transport = transportOptions.find(t => t.id === transportType);

  return (
    <div className="bg-white dark:bg-slate-950 min-h-screen relative">
      <SubtleSkyBackground />
      <PublicNav variant="transparent" />

      <section className="pt-32 pb-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-[#6443F4] mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center">
                <Calculator className="w-8 h-8 text-[#6443F4]" />
              </div>
              <div>
                <h1 
                  className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Dubai Trip Budget Calculator
                </h1>
                <p className="text-slate-600 dark:text-slate-400">Plan your perfect Dubai vacation costs</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div className="space-y-6" variants={fadeInUp}>
              <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <h2 
                  className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  <span className="w-8 h-8 rounded-lg bg-[#6443F4]/10 flex items-center justify-center text-[#6443F4] font-bold">1</span>
                  Trip Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">Number of Days: {days}</label>
                    <Slider
                      value={[days]}
                      onValueChange={(v) => setDays(v[0])}
                      min={1}
                      max={21}
                      step={1}
                      className="mt-2"
                      data-testid="slider-days"
                    />
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>1 day</span>
                      <span>21 days</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">Travelers</label>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setTravelers(Math.max(1, travelers - 1))}
                        className="rounded-full"
                        data-testid="button-minus-travelers"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-2xl font-bold w-12 text-center text-slate-900 dark:text-slate-100">{travelers}</span>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setTravelers(Math.min(10, travelers + 1))}
                        className="rounded-full"
                        data-testid="button-plus-travelers"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <h2 
                  className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  <span className="w-8 h-8 rounded-lg bg-[#6443F4]/10 flex items-center justify-center text-[#6443F4] font-bold">2</span>
                  <Hotel className="w-5 h-5" />
                  Accommodation
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {hotelOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setHotelType(option.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        hotelType === option.id 
                          ? "border-[#6443F4] bg-[#6443F4]/5 dark:bg-[#6443F4]/10" 
                          : "border-slate-200 dark:border-slate-700 hover:border-[#6443F4]/50"
                      }`}
                      data-testid={`option-hotel-${option.id}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{option.name}</span>
                        <span className="text-sm font-semibold text-[#6443F4]">{formatPrice(option.pricePerNight)}/night</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{option.desc}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <h2 
                  className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  <span className="w-8 h-8 rounded-lg bg-[#6443F4]/10 flex items-center justify-center text-[#6443F4] font-bold">3</span>
                  <Utensils className="w-5 h-5" />
                  Dining
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {diningOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setDiningType(option.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        diningType === option.id 
                          ? "border-[#6443F4] bg-[#6443F4]/5 dark:bg-[#6443F4]/10" 
                          : "border-slate-200 dark:border-slate-700 hover:border-[#6443F4]/50"
                      }`}
                      data-testid={`option-dining-${option.id}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{option.name}</span>
                        <span className="text-sm font-semibold text-[#6443F4]">{formatPrice(option.pricePerDay)}/day</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{option.desc}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <h2 
                  className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  <span className="w-8 h-8 rounded-lg bg-[#6443F4]/10 flex items-center justify-center text-[#6443F4] font-bold">4</span>
                  <Car className="w-5 h-5" />
                  Transportation
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {transportOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setTransportType(option.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        transportType === option.id 
                          ? "border-[#6443F4] bg-[#6443F4]/5 dark:bg-[#6443F4]/10" 
                          : "border-slate-200 dark:border-slate-700 hover:border-[#6443F4]/50"
                      }`}
                      data-testid={`option-transport-${option.id}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{option.name}</span>
                        <span className="text-sm font-semibold text-[#6443F4]">{formatPrice(option.pricePerDay)}/day</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{option.desc}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <h2 
                  className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  <span className="w-8 h-8 rounded-lg bg-[#6443F4]/10 flex items-center justify-center text-[#6443F4] font-bold">5</span>
                  <Ticket className="w-5 h-5" />
                  Activities (per person)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      onClick={() => toggleActivity(activity.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedActivities.includes(activity.id)
                          ? "border-[#6443F4] bg-[#6443F4]/5 dark:bg-[#6443F4]/10" 
                          : "border-slate-200 dark:border-slate-700 hover:border-[#6443F4]/50"
                      }`}
                      data-testid={`option-activity-${activity.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Ticket className="w-5 h-5 text-[#6443F4] flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium block text-slate-900 dark:text-slate-100">{activity.name}</span>
                          <span className="text-sm text-[#6443F4] font-semibold">
                            {activity.price === 0 ? "Free" : formatPrice(activity.price)}
                          </span>
                        </div>
                        {selectedActivities.includes(activity.id) && (
                          <div className="w-6 h-6 rounded-full bg-[#6443F4] text-white flex items-center justify-center">
                            <Plus className="w-4 h-4 rotate-45" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div 
              className="lg:sticky lg:top-24 h-fit"
              variants={fadeInUp}
            >
              <Card className="p-6 bg-slate-900 dark:bg-slate-800 text-white border-0 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 
                    className="text-lg font-semibold"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    Estimated Total
                  </h3>
                  <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
                    <SelectTrigger className="w-24 h-8 text-sm bg-white/10 border-white/20 text-white" data-testid="select-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(currencies).map((code) => (
                        <SelectItem key={code} value={code}>{code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="text-4xl font-bold mb-6" data-testid="text-total">
                  {formatPrice(total)}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-white/70">Accommodation ({days} nights)</span>
                    <span className="font-medium">{formatPrice((hotel?.pricePerNight || 0) * days)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-white/70">Dining ({days} days x {travelers})</span>
                    <span className="font-medium">{formatPrice((dining?.pricePerDay || 0) * days * travelers)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-white/70">Transport ({days} days)</span>
                    <span className="font-medium">{formatPrice((transport?.pricePerDay || 0) * days)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-white/70">Activities ({selectedActivities.length} selected)</span>
                    <span className="font-medium">
                      {formatPrice(selectedActivities.reduce((sum, actId) => {
                        const activity = activities.find(a => a.id === actId);
                        return sum + ((activity?.price || 0) * travelers);
                      }, 0))}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-xs text-white/60 mb-2">
                    <span>Per Person</span>
                    <span>{formatPrice(total / travelers)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Per Day</span>
                    <span>{formatPrice(total / days)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-6">
                  <Link href="/tools/currency">
                    <Button className="w-full rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white" data-testid="link-currency">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Currency Converter
                    </Button>
                  </Link>
                  <Link href="/tools/events">
                    <Button variant="outline" className="w-full rounded-full border-white/30 text-white hover:bg-white/10" data-testid="link-events">
                      Events Calendar
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> Prices are estimates based on average costs. Actual costs may vary based on season, availability, and specific choices.
                </p>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
