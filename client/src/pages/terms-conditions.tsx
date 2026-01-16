import { Link } from "wouter";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { SEOHead } from "@/components/seo-head";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { ContentBlocksRenderer } from "@/components/content-blocks-renderer";
import { sanitizeHTML } from "@/lib/sanitize";
import type { ContentBlock } from "@shared/schema";

interface StaticPage {
  id: string;
  slug: string;
  title: string;
  titleHe: string | null;
  contents: string | null;
  contentHe: string | null;
  blocks: ContentBlock[] | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
}

export default function TermsConditions() {
  const { locale } = useLocale();
  
  const { data: page, isLoading, error } = useQuery<StaticPage>({
    queryKey: ['/api/site-config/public/pages/terms-conditions'],
    retry: 1,
  });

  const getTitle = () => {
    if (page) {
      if (locale === 'he' && page.titleHe) {
        return page.titleHe;
      }
      return page.title;
    }
    return locale === 'he' ? 'תנאי שימוש' : 'Terms & Conditions';
  };

  const hasBlocks = page?.blocks && page.blocks.length > 0;
  const hasContent = page?.contents || (locale === 'he' && page?.contentHe);
  
  const getHtmlContent = () => {
    if (locale === 'he' && page?.contentHe) {
      return page.contentHe;
    }
    return page?.contents || '';
  };

  const metaTitle = page?.metaTitle || getTitle() + ' | TRAVI World';
  const metaDescription = page?.metaDescription || 'Terms and conditions for using TRAVI World travel platform.';

  return (
    <div className="bg-background min-h-screen flex flex-col">
      <SEOHead 
        title={metaTitle}
        description={metaDescription}
        canonicalPath="/terms"
      />
      <PublicNav />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" />
            {locale === 'he' ? 'חזרה לדף הבית' : 'Back to Home'}
          </Link>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error || !page ? (
            <div className="text-center py-20">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h1 className="text-2xl font-bold mb-2" data-testid="text-page-title">{getTitle()}</h1>
              <p className="text-muted-foreground">
                {locale === 'he' 
                  ? 'דף זה עדיין לא הוגדר. אנא צור קשר עם מנהל האתר.'
                  : 'This page has not been set up yet. Please contact the site administrator.'}
              </p>
            </div>
          ) : hasBlocks ? (
            <article dir={locale === 'he' ? 'rtl' : 'ltr'}>
              <h1 className="text-3xl font-bold mb-8 font-heading" data-testid="text-page-title">{getTitle()}</h1>
              <ContentBlocksRenderer blocks={page.blocks!} />
            </article>
          ) : hasContent ? (
            <article 
              className="prose prose-lg dark:prose-invert max-w-none"
              dir={locale === 'he' ? 'rtl' : 'ltr'}
            >
              <h1 className="font-heading" data-testid="text-page-title">{getTitle()}</h1>
              <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(getHtmlContent()) }} />
            </article>
          ) : (
            <div className="text-center py-20">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h1 className="text-2xl font-bold mb-2" data-testid="text-page-title">{getTitle()}</h1>
              <p className="text-muted-foreground">
                {locale === 'he' 
                  ? 'תוכן הדף עדיין לא הוזן.'
                  : 'This page contents has not been added yet.'}
              </p>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
