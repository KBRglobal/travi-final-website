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
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { FavoritesProvider } from "@/hooks/use-favorites";
// LiveEditProvider removed from public routes for better performance - only needed in admin
import { CookieConsentProvider } from "@/contexts/cookie-consent-context";
import { GeographicProvider } from "@/contexts/geographic-context";
import { createAliasRoutes } from "@/lib/navigation-aliases";
import { dubaiRoutes } from "@/routes/dubai-routes";
import { DESTINATION_IDS } from "@/types/destination";

const CookieConsentBanner = lazy(() => import("@/components/cookie-consent-banner").then(m => ({ default: m.CookieConsentBanner })));
const PWAInstallPrompt = lazy(() => import("@/components/pwa-install-prompt").then(m => ({ default: m.PWAInstallPrompt })));

const Homepage = lazy(() => import("@/pages/homepage-fast"));
const Attractions = lazy(() => import("@/pages/attractions"));
// NOTE: Hotel imports disabled - no hotel content in CMS yet
// const HotelsPage = lazy(() => import("@/pages/hotels"));
// const HotelDetail = lazy(() => import("@/pages/hotel-detail"));
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
const PilotAttractionPage = lazy(() => import("@/pages/pilot/pilot-attraction"));
const PilotGuidePage = lazy(() => import("@/pages/pilot/pilot-guide"));
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

const destinationIds = new Set(DESTINATION_IDS);
const isValidCity = (slug: string) => destinationIds.has(slug as any);

// Hash-based redirect helper - uses window.location.href for hash navigation
// since Wouter doesn't natively support hash fragments
function HashRedirect({ city, hash }: { city: string; hash: string }) {
  useEffect(() => {
    window.location.href = `/destinations/${city}#${hash}`;
  }, [city, hash]);
  return null;
}

// Non-hash redirect - uses Wouter's Redirect for proper SPA navigation
function CityAttractionsRedirect({ params }: { params: { city: string } }) {
  return <Redirect to={`/attractions/list/${params.city}`} />;
}

// NOTE: Hotel redirects disabled - no hotel content in CMS yet
// function CityHotelsRedirect({ params }: { params: { city: string } }) {
//   if (isValidCity(params.city)) {
//     return <HashRedirect city={params.city} hash="hotels" />;
//   }
//   return <PublicContentViewer />;
// }

// function DestinationHotelsRedirect({ params }: { params: { city: string } }) {
//   return <HashRedirect city={params.city} hash="hotels" />;
// }

// Hash redirect for /destinations/:city/news
function DestinationNewsRedirect({ params }: { params: { city: string } }) {
  return <HashRedirect city={params.city} hash="news" />;
}

// Hash redirect for /destinations/:city/when-to-go
function DestinationWhenToGoRedirect({ params }: { params: { city: string } }) {
  return <HashRedirect city={params.city} hash="best-time" />;
}

// Hash redirect for /destinations/:city/getting-around
function DestinationGettingAroundRedirect({ params }: { params: { city: string } }) {
  return <HashRedirect city={params.city} hash="getting-around" />;
}

// Hash redirect for /destinations/:city/faq
function DestinationFaqRedirect({ params }: { params: { city: string } }) {
  return <HashRedirect city={params.city} hash="faq" />;
}

// Non-hash redirect for attractions search - preserves query parameters
function AttractionsSearchRedirect() {
  const [location] = useLocation();
  const searchParams = new URL(window.location.href).search;
  return <Redirect to={`/search${searchParams}`} />;
}

// Non-hash redirect for guide city routes
function GuideCityRedirect({ params }: { params: { city: string } }) {
  if (isValidCity(params.city)) {
    return <Redirect to={`/guides/${params.city}-travel-guide`} />;
  }
  return <GuideDetailPage />;
}

const publicRoutes = [
  { path: "/login", component: Login },
  { path: "/access-denied", component: AccessDenied },
  { path: "/search", component: PublicSearch },
  // NOTE: Hotel routes disabled - no hotel content in CMS yet
  // { path: "/hotels", component: HotelsPage },
  // { path: "/hotels/:hotelId", component: HotelDetail },
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
  { path: "/pilot/:locale/attractions/:entityId", component: PilotAttractionPage },
  { path: "/pilot/:locale/guides/:guideSlug", component: PilotGuidePage },
  { path: "/attractions", component: Attractions },
  { path: "/attractions/list/:destination", component: DestinationAttractions },
  { path: "/:destination/attractions/:slug", component: TiqetsAttractionDetail },
  { path: "/attractions/:city/:slug", component: TiqetsAttractionDetail },
  { path: "/attractions/:destination/:attractionId", component: TiqetsAttractionDetail },
  { path: "/attractions/:slug", component: PublicContentViewer },
  // { path: "/hotels/:slug", component: PublicContentViewer }, // NOTE: Disabled - no hotel content in CMS yet
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
  "en", "ar", "hi", "zh", "ru", "ur", "fr",
  "de", "fa", "bn", "fil", "es", "tr", "it", "ja", "ko", "he",
  "pt", "nl", "pl", "sv", "th", "vi", "id", "ms", "cs", "el", "da", "no", "ro",
  "hu", "uk"
];

function PublicRouter() {
  return (
    <Switch>
      {/* Redirect routes - must be BEFORE generic routes */}
      <Route path="/attractions/search">{() => <AttractionsSearchRedirect />}</Route>
      <Route path="/destinations/:city/attractions">{(params) => <CityAttractionsRedirect params={params} />}</Route>
      {/* NOTE: Hotel redirects disabled - no hotel content in CMS yet */}
      {/* <Route path="/destinations/:city/hotels">{(params) => <DestinationHotelsRedirect params={params} />}</Route> */}
      <Route path="/destinations/:city/news">{(params) => <DestinationNewsRedirect params={params} />}</Route>
      <Route path="/destinations/:city/when-to-go">{(params) => <DestinationWhenToGoRedirect params={params} />}</Route>
      <Route path="/destinations/:city/getting-around">{(params) => <DestinationGettingAroundRedirect params={params} />}</Route>
      <Route path="/destinations/:city/faq">{(params) => <DestinationFaqRedirect params={params} />}</Route>
      {DESTINATION_IDS.map((city) => (
        <Route key={`city-attractions-${city}`} path={`/${city}/attractions`}>
          {() => <Redirect to={`/attractions/list/${city}`} />}
        </Route>
      ))}
      {/* NOTE: Hotel city routes disabled - no hotel content in CMS yet */}
      {/* {DESTINATION_IDS.map((city) => (
        <Route key={`hotels-city-${city}`} path={`/hotels/${city}`}>
          {() => <HashRedirect city={city} hash="hotels" />}
        </Route>
      ))} */}
      {DESTINATION_IDS.map((city) => (
        <Route key={`guides-city-${city}`} path={`/guides/${city}`}>
          {() => <Redirect to={`/guides/${city}-travel-guide`} />}
        </Route>
      ))}
      {/* Smart redirect: /attractions/:city -> /attractions/list/:city for valid destination IDs */}
      {DESTINATION_IDS.map((city) => (
        <Route key={`attractions-city-redirect-${city}`} path={`/attractions/${city}`}>
          {() => <Redirect to={`/attractions/list/${city}`} />}
        </Route>
      ))}

      {/* Travel style year-based URL redirects (SEO: 301 equivalent) */}
      <Route path="/travel-styles/luxury-travel-complete-guide-2026">{() => <Redirect to="/travel-styles/luxury-travel-complete-guide" />}</Route>
      <Route path="/travel-styles/adventure-outdoors-complete-guide-2026">{() => <Redirect to="/travel-styles/adventure-outdoors-complete-guide" />}</Route>
      <Route path="/travel-styles/family-travel-complete-guide-2026">{() => <Redirect to="/travel-styles/family-travel-complete-guide" />}</Route>
      <Route path="/travel-styles/budget-travel-complete-guide-2026">{() => <Redirect to="/travel-styles/budget-travel-complete-guide" />}</Route>
      <Route path="/travel-styles/honeymoon-romance-complete-guide-2026">{() => <Redirect to="/travel-styles/honeymoon-romance-complete-guide" />}</Route>
      <Route path="/travel-styles/solo-travel-complete-guide-2026">{() => <Redirect to="/travel-styles/solo-travel-complete-guide" />}</Route>

      <Route path="/en/:city/attractions/:slug" component={TraviLocationPage} />
      {/* NOTE: Hotel routes disabled - no hotel content in CMS yet */}
      {/* <Route path="/en/:city/hotels/:slug" component={TraviLocationPage} /> */}
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
      <Route path="/">{() => <Redirect to="/en" />}</Route>
      <Route path="/en" component={Homepage} />
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
