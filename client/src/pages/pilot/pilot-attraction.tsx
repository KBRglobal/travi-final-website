/**
 * PILOT: Localized Attraction Page
 * ================================
 * Isolated page for Octypo × Localization pilot testing.
 * 
 * ROUTES:
 * - /pilot/en/attractions/:entityId - English version
 * - /pilot/ar/attractions/:entityId - Arabic version (RTL)
 * 
 * CONSTRAINTS:
 * - No i18next/t() fallbacks - pure locale content from API
 * - No English leakage on Arabic page
 * - lang and dir attributes set correctly
 */

import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, MapPin, Clock, Info, HelpCircle } from "lucide-react";

interface PilotContent {
  id: string;
  entityType: string;
  entityId: string;
  locale: string;
  destination: string;
  introduction: string | null;
  whatToExpect: string | null;
  visitorTips: string | null;
  howToGetThere: string | null;
  faq: Array<{ question: string; answer: string }> | null;
  answerCapsule: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  imageAlt: string | null;
  imageCaption: string | null;
  localePurityScore: number | null;
  status: string;
}

interface PilotContentResponse {
  success: boolean;
  content?: PilotContent;
  error?: string;
}

export default function PilotAttractionPage() {
  const params = useParams<{ locale: string; entityId: string }>();
  const locale = params.locale as "en" | "ar";
  const entityId = params.entityId;
  
  const isRTL = locale === "ar";
  
  const { data, isLoading, error } = useQuery<PilotContentResponse>({
    queryKey: [`/api/octypo/pilot/content/${entityId}/${locale}`],
    enabled: !!entityId && ["en", "ar"].includes(locale),
  });
  
  if (!["en", "ar"].includes(locale)) {
    return (
      <div className="container mx-auto py-8" data-testid="pilot-invalid-locale">
        <Alert variant="destructive" data-testid="alert-invalid-locale">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle data-testid="text-error-title">Invalid Locale</AlertTitle>
          <AlertDescription data-testid="text-error-description">
            PILOT_FAIL: locale must be 'en' or 'ar' only. Got: {locale}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6" dir={isRTL ? "rtl" : "ltr"} data-testid="pilot-loading">
        <Skeleton className="h-12 w-3/4" data-testid="skeleton-title" />
        <Skeleton className="h-6 w-1/2" data-testid="skeleton-subtitle" />
        <Skeleton className="h-64 w-full" data-testid="skeleton-content" />
        <Skeleton className="h-32 w-full" data-testid="skeleton-secondary" />
      </div>
    );
  }
  
  if (error || !data?.success || !data?.content) {
    // ENFORCEMENT: No English fallback for non-English locales
    // Show "Localized content pending generation" state
    const isPendingGeneration = locale !== "en";
    
    return (
      <div className="container mx-auto py-8" dir={isRTL ? "rtl" : "ltr"} data-testid="pilot-content-pending">
        <Alert variant={isPendingGeneration ? "default" : "destructive"} data-testid="alert-content-pending">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle data-testid="text-pending-title">
            {locale === "ar" 
              ? "المحتوى قيد الإنشاء" 
              : isPendingGeneration 
                ? "Localized Content Pending Generation"
                : "Content Not Found"
            }
          </AlertTitle>
          <AlertDescription data-testid="text-pending-description">
            {locale === "ar" 
              ? `سيتم إنشاء المحتوى المحلي لهذا الجذب قريباً. لا يوجد محتوى إنجليزي كبديل.`
              : `No published content found for attraction ${entityId} in locale ${locale}`
            }
          </AlertDescription>
        </Alert>
        
        {isPendingGeneration && (
          <div className="mt-6 p-4 bg-muted rounded-lg" data-testid="pending-info">
            <h3 className="font-semibold mb-2" data-testid="text-pending-info-title">
              {locale === "ar" ? "معلومات النظام" : "System Information"}
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li data-testid="text-no-fallback">
                {locale === "ar" 
                  ? "• لا يوجد احتياطي للغة الإنجليزية" 
                  : "• No English fallback (enforcement active)"
                }
              </li>
              <li data-testid="text-native-gen">
                {locale === "ar" 
                  ? "• يتم إنشاء المحتوى مباشرة باللغة العربية" 
                  : "• Content will be generated natively in target locale"
                }
              </li>
              <li data-testid="text-purity-gate">
                {locale === "ar" 
                  ? "• نسبة نقاء اللغة المطلوبة: ≥98%" 
                  : "• Locale purity gate: ≥98% target language required"
                }
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  }
  
  const content = data.content;
  
  return (
    <>
      <Helmet>
        <html lang={locale} dir={isRTL ? "rtl" : "ltr"} />
        <title>{content.metaTitle || `Attraction ${entityId}`}</title>
        <meta name="description" content={content.metaDescription || ""} />
        <meta property="og:locale" content={locale === "ar" ? "ar_AE" : "en_US"} />
        <link rel="canonical" href={`/pilot/${locale}/attractions/${entityId}`} />
        {locale === "en" && (
          <link rel="alternate" hrefLang="ar" href={`/pilot/ar/attractions/${entityId}`} />
        )}
        {locale === "ar" && (
          <link rel="alternate" hrefLang="en" href={`/pilot/en/attractions/${entityId}`} />
        )}
      </Helmet>
      
      <div 
        className="min-h-screen bg-background"
        dir={isRTL ? "rtl" : "ltr"}
        lang={locale}
        data-testid="pilot-attraction-page"
      >
        <div className="container mx-auto py-8 space-y-8">
          <div className="flex items-center gap-2 flex-wrap" data-testid="pilot-badges">
            <Badge variant="outline" className="text-xs" data-testid="badge-pilot">
              PILOT
            </Badge>
            <Badge variant="secondary" className="text-xs" data-testid="badge-locale">
              {locale.toUpperCase()}
            </Badge>
            {isRTL && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-rtl">
                RTL
              </Badge>
            )}
            {content.localePurityScore && (
              <Badge 
                variant={content.localePurityScore >= 0.98 ? "default" : "destructive"}
                className="text-xs"
                data-testid="badge-purity"
              >
                Purity: {(content.localePurityScore * 100).toFixed(1)}%
              </Badge>
            )}
            <Badge variant="outline" className="text-xs" data-testid="badge-destination">
              {content.destination}
            </Badge>
          </div>
          
          <header data-testid="pilot-header">
            <h1 className="text-4xl font-bold tracking-tight mb-4" data-testid="text-title">
              {content.metaTitle || `Attraction ${entityId}`}
            </h1>
            {content.answerCapsule && (
              <Card className="bg-primary/5 border-primary/20" data-testid="card-answer-capsule">
                <CardContent className="pt-4">
                  <p className="text-lg leading-relaxed" data-testid="text-answer-capsule">
                    {content.answerCapsule}
                  </p>
                </CardContent>
              </Card>
            )}
          </header>
          
          {content.introduction && (
            <section data-testid="section-introduction">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2" data-testid="heading-introduction">
                <Info className="h-5 w-5" />
                {locale === "ar" ? "مقدمة" : "Introduction"}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed whitespace-pre-wrap" data-testid="text-introduction">
                  {content.introduction}
                </p>
              </div>
            </section>
          )}
          
          {content.whatToExpect && (
            <section data-testid="section-what-to-expect">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2" data-testid="heading-what-to-expect">
                <Clock className="h-5 w-5" />
                {locale === "ar" ? "ماذا تتوقع" : "What to Expect"}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed whitespace-pre-wrap" data-testid="text-what-to-expect">
                  {content.whatToExpect}
                </p>
              </div>
            </section>
          )}
          
          {content.visitorTips && (
            <section data-testid="section-visitor-tips">
              <h2 className="text-2xl font-semibold mb-4" data-testid="heading-visitor-tips">
                {locale === "ar" ? "نصائح للزوار" : "Visitor Tips"}
              </h2>
              <Card data-testid="card-visitor-tips">
                <CardContent className="pt-6">
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="leading-relaxed whitespace-pre-wrap" data-testid="text-visitor-tips">
                      {content.visitorTips}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
          
          {content.howToGetThere && (
            <section data-testid="section-how-to-get-there">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2" data-testid="heading-how-to-get-there">
                <MapPin className="h-5 w-5" />
                {locale === "ar" ? "كيفية الوصول" : "How to Get There"}
              </h2>
              <Card data-testid="card-how-to-get-there">
                <CardContent className="pt-6">
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="leading-relaxed whitespace-pre-wrap" data-testid="text-how-to-get-there">
                      {content.howToGetThere}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
          
          {content.faq && content.faq.length > 0 && (
            <section data-testid="section-faq">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2" data-testid="heading-faq">
                <HelpCircle className="h-5 w-5" />
                {locale === "ar" ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
              </h2>
              <div className="space-y-4">
                {content.faq.map((item, index) => (
                  <Card key={index} data-testid={`card-faq-${index}`}>
                    <CardHeader>
                      <CardTitle className="text-lg" data-testid={`text-faq-question-${index}`}>{item.question}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground" data-testid={`text-faq-answer-${index}`}>{item.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
          
          <footer className="border-t pt-8 mt-8" data-testid="pilot-footer">
            <div className="text-sm text-muted-foreground space-y-1">
              <p data-testid="text-entity-id">Entity ID: {content.entityId}</p>
              <p data-testid="text-locale">Locale: {content.locale}</p>
              <p data-testid="text-destination">Destination: {content.destination}</p>
              <p data-testid="text-status">Status: {content.status}</p>
              {content.localePurityScore && (
                <p data-testid="text-purity-score">Locale Purity Score: {(content.localePurityScore * 100).toFixed(2)}%</p>
              )}
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
