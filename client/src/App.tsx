import { useEffect, Suspense, lazy } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAnalytics } from "@/hooks/use-analytics";
import { initGA } from "@/lib/analytics";
import { Loader2 } from "lucide-react";
import { LocaleProvider } from "@/lib/i18n/LocaleRouter";
import { FavoritesProvider } from "@/hooks/use-favorites";
// LiveEditProvider removed from public routes for better performance - only needed in admin
import { CookieConsentProvider } from "@/contexts/cookie-consent-context";
import { GeographicProvider } from "@/contexts/geographic-context";
import { createAliasRoutes } from "@/lib/navigation-aliases";
import { dubaiRoutes } from "@/routes/dubai-routes";

const CookieConsentBanner = lazy(() => import("@/components/cookie-consent-banner").then(m => ({ default: m.CookieConsentBanner })));
const PWAInstallPrompt = lazy(() => import("@/components/pwa-install-prompt").then(m => ({ default: m.PWAInstallPrompt })));

const Homepage = lazy(() => import("@/pages/homepage-fast"));
const Attractions = lazy(() => import("@/pages/attractions"));
const HotelsPage = lazy(() => import("@/pages/hotels"));
const HotelDetail = lazy(() => import("@/pages/hotel-detail"));
const TiqetsAttractionDetail = lazy(() => import("@/pages/attraction-detail"));
const DestinationAttractions = lazy(() => import("@/pages/destination-attractions"));
const TravelGuidesPage = lazy(() => import("@/pages/travel-guides"));
const GuideDetailPage = lazy(() => import("@/pages/guide-detail"));
const TravelStyleArticle = lazy(() => import("@/pages/travel-style-article"));
const PublicArticles = lazy(() => import("@/pages/public-articles"));
const PublicEvents = lazy(() => import("@/pages/public-events"));
const PublicSearch = lazy(() => import("@/pages/public-search"));
const PublicOffPlan = lazy(() => import("@/pages/public-off-plan"));
const GlossaryHub = lazy(() => import("@/pages/glossary-hub"));
const RasAlKhaimahPage = lazy(() => import("@/pages/public/ras-al-khaimah"));
const WynnAlMarjanGuidePage = lazy(() => import("@/pages/public/guides/wynn-al-marjan-guide"));
const JebelJaisAdventureGuidePage = lazy(() => import("@/pages/public/guides/jebel-jais-adventure-guide"));
const DubaiToRakTransportPage = lazy(() => import("@/pages/public/guides/dubai-to-rak-transport"));
const DubaiVsRakComparisonPage = lazy(() => import("@/pages/public/guides/dubai-vs-rak-comparison"));
const WhereToStayRakPage = lazy(() => import("@/pages/public/guides/where-to-stay-rak"));
const RakRealEstateInvestmentPage = lazy(() => import("@/pages/public/guides/rak-real-estate-investment"));
const DestinationsLanding = lazy(() => import("@/pages/destinations"));
const DestinationPage = lazy(() => import("@/pages/destination-page"));
const TraviLocationPage = lazy(() => import("@/pages/public/travi-location-page"));
const PublicShopping = lazy(() => import("@/pages/public-shopping"));
const PublicNews = lazy(() => import("@/pages/public-news"));
const PublicContentViewer = lazy(() => import("@/pages/public-content-viewer"));
const PublicDocs = lazy(() => import("@/pages/public-docs"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy"));
const TermsConditions = lazy(() => import("@/pages/terms"));
const CookiePolicy = lazy(() => import("@/pages/cookies"));
const SecurityPolicy = lazy(() => import("@/pages/security"));
const AffiliateDisclosure = lazy(() => import("@/pages/affiliate-disclosure"));
const PublicAbout = lazy(() => import("@/pages/about"));
const PublicContact = lazy(() => import("@/pages/contact"));
const PublicSurvey = lazy(() => import("@/pages/public-survey"));
const PartnersJoin = lazy(() => import("@/pages/partners-join"));
const PartnersDashboard = lazy(() => import("@/pages/partners-dashboard"));
const HelpCenterPublic = lazy(() => import("@/pages/help"));
const HelpCategory = lazy(() => import("@/pages/help/category"));
const HelpArticle = lazy(() => import("@/pages/help/article"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Login = lazy(() => import("@/pages/login"));
const AccessDenied = lazy(() => import("@/pages/access-denied"));
const TestPage = lazy(() => import("@/pages/test"));

const AdminLayout = lazy(() => import("@/routes/admin-module"));

function PageLoader() {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
      <img 
        src="/logos/Mascot_for_Dark_Background.png" 
        alt="TRAVI" 
        className="w-16 h-16 object-contain animate-bounce"
      />
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

const publicRoutes = [
  { path: "/login", component: Login },
  { path: "/access-denied", component: AccessDenied },
  { path: "/search", component: PublicSearch },
  { path: "/hotels", component: HotelsPage },
  { path: "/hotels/:hotelId", component: HotelDetail },
  { path: "/guides", component: TravelGuidesPage },
  { path: "/travel-guides", component: TravelGuidesPage },
  { path: "/travel-styles/:slug", component: TravelStyleArticle },
  { path: "/guides/wynn-al-marjan-island", component: WynnAlMarjanGuidePage },
  { path: "/guides/jebel-jais-adventure", component: JebelJaisAdventureGuidePage },
  { path: "/guides/dubai-to-rak-transport", component: DubaiToRakTransportPage },
  { path: "/guides/dubai-vs-rak", component: DubaiVsRakComparisonPage },
  { path: "/guides/where-to-stay-rak", component: WhereToStayRakPage },
  { path: "/guides/rak-real-estate-investment", component: RakRealEstateInvestmentPage },
  { path: "/guides/:slug", component: GuideDetailPage },
  { path: "/attractions", component: Attractions },
  { path: "/attractions/list/:destination", component: DestinationAttractions },
  { path: "/:destination/attractions/:slug", component: TiqetsAttractionDetail },
  { path: "/attractions/:city/:slug", component: TiqetsAttractionDetail },
  { path: "/attractions/:destination/:attractionId", component: TiqetsAttractionDetail },
  { path: "/attractions/:slug", component: PublicContentViewer },
  { path: "/hotels/:slug", component: PublicContentViewer },
  { path: "/transport/:slug", component: PublicContentViewer },
  { path: "/articles", component: PublicArticles },
  { path: "/articles/:slug", component: PublicContentViewer },
  { path: "/events", component: PublicEvents },
  { path: "/events/:slug", component: PublicContentViewer },
  { path: "/help", component: HelpCenterPublic },
  { path: "/help/:slug", component: HelpCategory },
  { path: "/help/:categorySlug/:articleSlug", component: HelpArticle },
  { path: "/dubai-real-estate", component: PublicOffPlan },
  { path: "/dubai-off-plan-properties", component: PublicOffPlan },
  { path: "/glossary", component: GlossaryHub },
  { path: "/shopping", component: PublicShopping },
  { path: "/news", component: PublicNews },
  { path: "/docs", component: PublicDocs },
  { path: "/docs/:path*", component: PublicDocs },
  { path: "/privacy", component: PrivacyPolicy },
  { path: "/privacy-policy", component: PrivacyPolicy },
  { path: "/terms", component: TermsConditions },
  { path: "/terms-conditions", component: TermsConditions },
  { path: "/cookie-policy", component: CookiePolicy },
  { path: "/cookies", component: CookiePolicy },
  { path: "/security", component: SecurityPolicy },
  { path: "/affiliate-disclosure", component: AffiliateDisclosure },
  { path: "/about", component: PublicAbout },
  { path: "/contact", component: PublicContact },
  { path: "/survey/:slug", component: PublicSurvey },
  { path: "/partners/join", component: PartnersJoin },
  { path: "/partners/dashboard", component: PartnersDashboard },
  ...createAliasRoutes(),
  ...dubaiRoutes,
];

const LOCALE_PREFIXES = [
  "ar", "hi", "zh", "ru", "ur", "fr",
  "de", "fa", "bn", "fil", "es", "tr", "it", "ja", "ko", "he"
];

function PublicRouter() {
  return (
    <Switch>
      <Route path="/en/:city/attractions/:slug" component={TraviLocationPage} />
      <Route path="/en/:city/hotels/:slug" component={TraviLocationPage} />
      <Route path="/en/:city/restaurants/:slug" component={TraviLocationPage} />
      
      {LOCALE_PREFIXES.map((locale) => (
        <Route key={`${locale}-home`} path={`/${locale}`} component={Homepage} />
      ))}
      {LOCALE_PREFIXES.flatMap((locale) =>
        publicRoutes.map((route) => (
          <Route
            key={`${locale}-${route.path}`}
            path={`/${locale}${route.path}`}
            component={route.component}
          />
        ))
      )}

      {publicRoutes.map((route) => (
        <Route key={route.path} path={route.path} component={route.component} />
      ))}
      <Route path="/destinations" component={DestinationsLanding} />
      <Route path="/destinations/ras-al-khaimah" component={RasAlKhaimahPage} />
      <Route path="/destinations/:slug" component={DestinationPage} />
      <Route path="/bangkok">{() => <Redirect to="/destinations/bangkok" />}</Route>
      <Route path="/paris">{() => <Redirect to="/destinations/paris" />}</Route>
      <Route path="/istanbul">{() => <Redirect to="/destinations/istanbul" />}</Route>
      <Route path="/london">{() => <Redirect to="/destinations/london" />}</Route>
      <Route path="/new-york">{() => <Redirect to="/destinations/new-york" />}</Route>
      <Route path="/singapore">{() => <Redirect to="/destinations/singapore" />}</Route>
      <Route path="/test" component={TestPage} />
      <Route path="/" component={Homepage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith("/admin");
  const isV2Route = location.startsWith("/v2");

  useEffect(() => {
    initGA();
  }, []);

  useAnalytics();

  return (
    <QueryClientProvider client={queryClient}>
      <CookieConsentProvider>
        <LocaleProvider>
          <FavoritesProvider>
            <TooltipProvider>
              <a href="#main-content" className="skip-link">
                Skip to main content
              </a>
              <Suspense fallback={<PageLoader />}>
                <main id="main-content" tabIndex={-1}>
                {isAdminRoute ? (
                  <AdminLayout />
                ) : isV2Route ? (
                  <GeographicProvider>
                    <PublicRouter />
                  </GeographicProvider>
                ) : (
                  <PublicRouter />
                )}
                </main>
              </Suspense>
              <Toaster />
              <Suspense fallback={null}>
                <CookieConsentBanner />
                <PWAInstallPrompt />
              </Suspense>
            </TooltipProvider>
          </FavoritesProvider>
        </LocaleProvider>
      </CookieConsentProvider>
    </QueryClientProvider>
  );
}

export default App;
