import { Link } from "wouter";
import { Calendar, MapPin, Clock, Filter, Search, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ContentWithRelations } from "@shared/schema";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

const categories = [
  { id: "all", name: "All Events" },
  { id: "festivals", name: "Festivals" },
  { id: "sports", name: "Sports" },
  { id: "concerts", name: "Concerts & Shows" },
  { id: "exhibitions", name: "Exhibitions" },
  { id: "food", name: "Food & Dining" },
  { id: "cultural", name: "Cultural" },
];

const months = [
  { value: "all", label: "All Months" },
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateRange(start: string, end?: string): string {
  if (!end) return formatDate(start);
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
    return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function getCategoryBadgeVariant(category: string): "default" | "secondary" | "outline" {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    festivals: "default",
    sports: "secondary",
    concerts: "default",
    exhibitions: "secondary",
    food: "default",
    cultural: "secondary",
  };
  return variants[category] || "secondary";
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

export default function PublicEvents() {
  const { t, isRTL, localePath } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const { data: eventsData, isLoading } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/contents?type=event&status=published"],
  });

  const events = useMemo(() => {
    if (!eventsData) return [];
    return eventsData.map((contents) => {
      const eventData = contents.event;
      return {
        id: contents.id,
        title: contents.title,
        slug: contents.slug,
        description: contents.metaDescription || "",
        date: eventData?.eventDate?.toISOString() || new Date().toISOString(),
        endDate: eventData?.endDate?.toISOString() || undefined,
        time: "All Day",
        location: eventData?.venue || "Dubai",
        category: "cultural",
        image: contents.heroImage || "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600",
        featured: eventData?.isFeatured || false,
      };
    });
  }, [eventsData]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || event.category === selectedCategory;
      
      const eventDate = new Date(event.date);
      const eventMonth = String(eventDate.getMonth() + 1).padStart(2, "0");
      const matchesMonth = selectedMonth === "all" || eventMonth === selectedMonth;
      
      return matchesSearch && matchesCategory && matchesMonth;
    });
  }, [events, searchQuery, selectedCategory, selectedMonth]);

  const featuredEvents = filteredEvents.filter(e => e.featured);
  const regularEvents = filteredEvents.filter(e => !e.featured);

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
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-[#6443F4]" />
              </div>
              <div>
                <h1 
                  className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  {t('events.pageTitle')}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">{t('events.pageSubtitle')}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-8 border-b border-slate-200 dark:border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className={`relative flex-1 max-w-md ${isRTL ? 'pr-10' : 'pl-10'}`}>
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
              <Input
                type="text"
                placeholder={t('nav.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${isRTL ? 'pr-10' : 'pl-10'} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700`}
                data-testid="input-search-events"
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" data-testid="select-category">
                  <Filter className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" data-testid="select-month">
                  <Calendar className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <motion.div 
              className="text-center py-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 
                className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                {t('search.noResults')}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{t('events.pageSubtitle')}</p>
              <Link href={localePath("/")}>
                <Button className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white" data-testid="button-back-home">
                  {t('common.viewAll')}
                </Button>
              </Link>
            </motion.div>
          ) : (
            <>
              {featuredEvents.length > 0 && (
                <motion.div 
                  className="mb-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <h2 
                    className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-slate-100"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    <span className="w-2 h-8 bg-[#6443F4] rounded-full" />
                    {t('events.upcoming')}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {featuredEvents.map((event) => (
                      <Card 
                        key={event.id} 
                        className="overflow-hidden group bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl transition-all duration-300"
                        data-testid={`card-event-featured-${event.id}`}
                      >
                        <div className="flex flex-col sm:flex-row">
                          <div className="sm:w-48 h-40 sm:h-auto flex-shrink-0 overflow-hidden">
                            <img 
                              src={event.image} 
                              alt={event.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 p-5">
                            <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                              <Badge variant={getCategoryBadgeVariant(event.category)} className="no-default-hover-elevate no-default-active-elevate">
                                {categories.find(c => c.id === event.category)?.name || event.category}
                              </Badge>
                              <Badge className="bg-amber-500 text-white no-default-hover-elevate no-default-active-elevate">
                                Featured
                              </Badge>
                            </div>
                            <h3 
                              className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2"
                              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                            >
                              {event.title}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-3 line-clamp-2">{event.description}</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <Calendar className="w-4 h-4 text-[#6443F4]" />
                                <span>{formatDateRange(event.date, event.endDate)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <Clock className="w-4 h-4 text-[#6443F4]" />
                                <span>{event.time}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <MapPin className="w-4 h-4 text-[#6443F4]" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h2 
                  className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-slate-100"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  <span className="w-2 h-8 bg-[#6443F4] rounded-full" />
                  {t('events.pageTitle')}
                  <span className="text-slate-500 dark:text-slate-400 font-normal text-lg">({filteredEvents.length})</span>
                </h2>
                <motion.div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {(featuredEvents.length > 0 ? regularEvents : filteredEvents).map((event) => (
                    <motion.div key={event.id} variants={fadeInUp}>
                      <Card 
                        className="overflow-hidden group bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl transition-all duration-300"
                        data-testid={`card-event-${event.id}`}
                      >
                        <div className="aspect-video relative overflow-hidden">
                          <img 
                            src={event.image} 
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                          <Badge 
                            variant={getCategoryBadgeVariant(event.category)} 
                            className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} no-default-hover-elevate no-default-active-elevate`}
                          >
                            {categories.find(c => c.id === event.category)?.name || event.category}
                          </Badge>
                        </div>
                        <div className="p-5">
                          <h3 
                            className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 line-clamp-1"
                            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                          >
                            {event.title}
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm mb-3 line-clamp-2">{event.description}</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                              <Calendar className="w-3.5 h-3.5 text-[#6443F4]" />
                              <span className="truncate">{formatDateRange(event.date, event.endDate)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                              <MapPin className="w-3.5 h-3.5 text-[#6443F4]" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </>
          )}
        </div>
      </section>

      <section className="py-12 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="p-8 bg-slate-900 dark:bg-slate-800 border-0 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 
                    className="text-2xl font-bold mb-2"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    {t('common.learnMore')}
                  </h3>
                  <p className="text-white/80">{t('events.pageSubtitle')}</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Link href={localePath("/tools/budget")}>
                    <Button className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white" data-testid="link-budget">
                      Budget Calculator
                    </Button>
                  </Link>
                  <Link href={localePath("/tools/currency")}>
                    <Button variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10" data-testid="link-currency">
                      Currency Converter
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
