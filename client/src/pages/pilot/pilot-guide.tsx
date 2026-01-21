/**
 * PILOT: Localized Guide Page
 * ===========================
 * Isolated page for Guide Localization pilot testing.
 * 
 * ROUTES:
 * - /pilot/en/guides/:guideSlug - English version
 * - /pilot/ar/guides/:guideSlug - Arabic version (RTL)
 * 
 * CONSTRAINTS:
 * - No English fallback for non-English locales
 * - lang and dir attributes set correctly
 * - Native content only (not translated)
 */

import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, BookOpen, Lightbulb, Star, HelpCircle, Info } from "lucide-react";

interface GuideContent {
  id: string;
  status: string;
  destination: string;
  introduction?: string;
  whatToExpect?: string;
  highlights?: string[];
  tips?: string;
  faq?: Array<{ question: string; answer: string }>;
  answerCapsule?: string;
  metaTitle?: string;
  metaDescription?: string;
  localePurityScore?: number;
}

interface GuideContentResponse {
  success: boolean;
  exists: boolean;
  guideSlug: string;
  locale: string;
  content?: GuideContent;
  message?: string;
}

export default function PilotGuidePage() {
  const params = useParams<{ locale: string; guideSlug: string }>();
  const locale = params.locale as "en" | "ar";
  const guideSlug = params.guideSlug;
  
  const isRTL = locale === "ar";
  
  const { data, isLoading, error } = useQuery<GuideContentResponse>({
    queryKey: ["/api/octypo/pilot/guides/content", guideSlug, locale],
    enabled: !!guideSlug && ["en", "ar"].includes(locale),
  });
  
  if (!["en", "ar"].includes(locale)) {
    return (
      <div className="container mx-auto py-8" data-testid="pilot-guide-invalid-locale">
        <Alert variant="destructive" data-testid="alert-invalid-locale">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle data-testid="text-error-title">Invalid Locale</AlertTitle>
          <AlertDescription data-testid="text-error-description">
            GUIDE_FAIL: locale must be 'en' or 'ar' only. Got: {locale}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6" dir={isRTL ? "rtl" : "ltr"} data-testid="pilot-guide-loading">
        <Skeleton className="h-12 w-3/4" data-testid="skeleton-title" />
        <Skeleton className="h-6 w-1/2" data-testid="skeleton-subtitle" />
        <Skeleton className="h-64 w-full" data-testid="skeleton-content" />
        <Skeleton className="h-32 w-full" data-testid="skeleton-secondary" />
      </div>
    );
  }
  
  if (error || !data?.success || !data?.content) {
    const isPendingGeneration = locale !== "en";
    
    return (
      <div className="container mx-auto py-8" dir={isRTL ? "rtl" : "ltr"} data-testid="pilot-guide-content-pending">
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
              ? `سيتم إنشاء المحتوى المحلي لهذا الدليل قريباً. لا يوجد محتوى إنجليزي كبديل.`
              : isPendingGeneration
                ? `Localized content for this guide in ${locale.toUpperCase()} is pending generation. No English fallback is available.`
                : `No published content found for guide ${guideSlug} in locale ${locale}`
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
        <title>{content.metaTitle || `Guide: ${guideSlug}`}</title>
        <meta name="description" content={content.metaDescription || ""} />
        <meta property="og:locale" content={locale === "ar" ? "ar_AE" : "en_US"} />
        <link rel="canonical" href={`/pilot/${locale}/guides/${guideSlug}`} />
        {locale === "en" && (
          <link rel="alternate" hrefLang="ar" href={`/pilot/ar/guides/${guideSlug}`} />
        )}
        {locale === "ar" && (
          <link rel="alternate" hrefLang="en" href={`/pilot/en/guides/${guideSlug}`} />
        )}
      </Helmet>
      
      <div 
        className="min-h-screen bg-background"
        dir={isRTL ? "rtl" : "ltr"}
        lang={locale}
        data-testid="pilot-guide-page"
      >
        <div className="container mx-auto py-8 space-y-8">
          <div className="flex items-center gap-2 flex-wrap" data-testid="pilot-guide-badges">
            <Badge variant="outline" className="text-xs" data-testid="badge-pilot">
              PILOT
            </Badge>
            <Badge variant="secondary" className="text-xs" data-testid="badge-guide">
              GUIDE
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
          
          <header data-testid="pilot-guide-header">
            <h1 className="text-4xl font-bold tracking-tight mb-4" data-testid="text-guide-title">
              {content.metaTitle || guideSlug}
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
                <BookOpen className="h-5 w-5" />
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
                <Info className="h-5 w-5" />
                {locale === "ar" ? "ماذا تتوقع" : "What to Expect"}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed whitespace-pre-wrap" data-testid="text-what-to-expect">
                  {content.whatToExpect}
                </p>
              </div>
            </section>
          )}
          
          {content.highlights && content.highlights.length > 0 && (
            <section data-testid="section-highlights">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2" data-testid="heading-highlights">
                <Star className="h-5 w-5" />
                {locale === "ar" ? "أبرز النقاط" : "Highlights"}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {content.highlights.map((highlight, index) => (
                  <Card key={index} className="bg-muted/50" data-testid={`card-highlight-${index}`}>
                    <CardContent className="pt-4">
                      <p className="text-sm" data-testid={`text-highlight-${index}`}>{highlight}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
          
          {content.tips && (
            <section data-testid="section-tips">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2" data-testid="heading-tips">
                <Lightbulb className="h-5 w-5" />
                {locale === "ar" ? "نصائح السفر" : "Travel Tips"}
              </h2>
              <Card data-testid="card-tips">
                <CardContent className="pt-6">
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="leading-relaxed whitespace-pre-wrap" data-testid="text-tips">
                      {content.tips}
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
          
          <footer className="border-t pt-8 mt-8" data-testid="pilot-guide-footer">
            <div className="text-sm text-muted-foreground space-y-1">
              <p data-testid="text-guide-slug">Guide: {guideSlug}</p>
              <p data-testid="text-locale">Locale: {locale}</p>
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
