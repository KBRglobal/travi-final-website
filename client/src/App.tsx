import { useEffect, Suspense, lazy } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAnalytics } from "@/hooks/use-analytics";
import { initGA } from "@/lib/analytics";
import { Loader2 } from "lucide-react";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { FavoritesProvider } from "@/hooks/use-favorites";
import { CookieConsentProvider } from "@/contexts/cookie-consent-context";
import { createAliasRoutes } from "@/lib/navigation-aliases";
import { DESTINATION_IDS } from "@/types/destination";

const CookieConsentBanner = lazy(() => import("@/components/cookie-consent-banner").then(m => ({ default: m.CookieConsentBanner })));
const PWAInstallPrompt = lazy(() => import("@/components/pwa-install-prompt").then(m => ({ default: m.PWAInstallPrompt })));

const Homepage = lazy(() => import("@/pages/homepage"));
const Attractions = lazy(() => import("@/pages/attractions"));
const TiqetsAttractionDetail = lazy(() => import("@/pages/attraction-detail"));
const DestinationAttractions = lazy(() => import("@/pages/destination-attractions"));
const TravelGuidesPage = lazy(() => import("@/pages/travel-guides"));
const GuideDetailPage = lazy(() => import("@/pages/guide-detail"));
const DestinationsLanding = lazy(() => import("@/pages/destinations"));
const DestinationPage = lazy(() => import("@/pages/destination-page"));
const TraviLocationPage = lazy(() => import("@/pages/public/travi-location-page"));
const RasAlKhaimahPage = lazy(() => import("@/pages/public/ras-al-khaimah"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy"));
const TermsConditions = lazy(() => import("@/pages/terms"));
const CookiePolicy = lazy(() => import("@/pages/cookies"));
const SecurityPolicy = lazy(() => import("@/pages/security"));
const PublicAbout = lazy(() => import("@/pages/about"));
const PublicContact = lazy(() => import("@/pages/contact"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Login = lazy(() => import("@/pages/login"));
const AccessDenied = lazy(() => import("@/pages/access-denied"));

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

function HashRedirect({ city, hash }: { city: string; hash: string }) {
  useEffect(() => {
    window.location.href = `/destinations/${city}#${hash}`;
  }, [city, hash]);
  return null;
}

function CityAttractionsRedirect({ params }: { params: { city: string } }) {
  return <Redirect to={`/attractions/list/${params.city}`} />;
}

function DestinationNewsRedirect({ params }: { params: { city: string } }) {
  return <HashRedirect city={params.city} hash="news" />;
}

function DestinationWhenToGoRedirect({ params }: { params: { city: string } }) {
  return <HashRedirect city={params.city} hash="best-time" />;
}

function DestinationGettingAroundRedirect({ params }: { params: { city: string } }) {
  return <HashRedirect city={params.city} hash="getting-around" />;
}

function DestinationFaqRedirect({ params }: { params: { city: string } }) {
  return <HashRedirect city={params.city} hash="faq" />;
}

const publicRoutes = [
  { path: "/login", component: Login },
  { path: "/access-denied", component: AccessDenied },
  { path: "/guides", component: TravelGuidesPage },
  { path: "/travel-guides", component: TravelGuidesPage },
  { path: "/guides/:slug", component: GuideDetailPage },
  { path: "/attractions", component: Attractions },
  { path: "/attractions/list/:destination", component: DestinationAttractions },
  { path: "/:destination/attractions/:slug", component: TiqetsAttractionDetail },
  { path: "/attractions/:city/:slug", component: TiqetsAttractionDetail },
  { path: "/attractions/:destination/:attractionId", component: TiqetsAttractionDetail },
  { path: "/destinations", component: DestinationsLanding },
  { path: "/destinations/ras-al-khaimah", component: RasAlKhaimahPage },
  { path: "/destinations/:slug", component: DestinationPage },
  { path: "/privacy", component: PrivacyPolicy },
  { path: "/privacy-policy", component: PrivacyPolicy },
  { path: "/terms", component: TermsConditions },
  { path: "/terms-conditions", component: TermsConditions },
  { path: "/cookie-policy", component: CookiePolicy },
  { path: "/cookies", component: CookiePolicy },
  { path: "/security", component: SecurityPolicy },
  { path: "/about", component: PublicAbout },
  { path: "/contact", component: PublicContact },
  ...createAliasRoutes(),
];

const LOCALE_PREFIXES = [
  "en", "ar", "hi", "zh", "ru", "ur", "fr",
  "de", "fa", "bn", "fil", "es", "tr", "it", "ja", "ko", "he",
  "pt", "nl", "pl", "sv", "th", "vi", "id", "ms", "cs", "el", "uk"
];

function PublicRouter() {
  return (
    <Switch>
      <Route path="/destinations/:city/attractions">{(params) => <CityAttractionsRedirect params={params} />}</Route>
      <Route path="/destinations/:city/news">{(params) => <DestinationNewsRedirect params={params} />}</Route>
      <Route path="/destinations/:city/when-to-go">{(params) => <DestinationWhenToGoRedirect params={params} />}</Route>
      <Route path="/destinations/:city/getting-around">{(params) => <DestinationGettingAroundRedirect params={params} />}</Route>
      <Route path="/destinations/:city/faq">{(params) => <DestinationFaqRedirect params={params} />}</Route>
      
      {DESTINATION_IDS.map((city) => (
        <Route key={`city-attractions-${city}`} path={`/${city}/attractions`}>
          {() => <Redirect to={`/attractions/list/${city}`} />}
        </Route>
      ))}
      
      {DESTINATION_IDS.map((city) => (
        <Route key={`guides-city-${city}`} path={`/guides/${city}`}>
          {() => <Redirect to={`/guides/${city}-travel-guide`} />}
        </Route>
      ))}
      
      {DESTINATION_IDS.map((city) => (
        <Route key={`attractions-city-redirect-${city}`} path={`/attractions/${city}`}>
          {() => <Redirect to={`/attractions/list/${city}`} />}
        </Route>
      ))}

      <Route path="/en/:city/attractions/:slug" component={TraviLocationPage} />
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
      
      <Route path="/bangkok">{() => <Redirect to="/destinations/bangkok" />}</Route>
      <Route path="/paris">{() => <Redirect to="/destinations/paris" />}</Route>
      <Route path="/istanbul">{() => <Redirect to="/destinations/istanbul" />}</Route>
      <Route path="/london">{() => <Redirect to="/destinations/london" />}</Route>
      <Route path="/new-york">{() => <Redirect to="/destinations/new-york" />}</Route>
      <Route path="/singapore">{() => <Redirect to="/destinations/singapore" />}</Route>
      
      <Route path="/">{() => <Redirect to="/en" />}</Route>
      <Route path="/en" component={Homepage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith("/admin");

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
