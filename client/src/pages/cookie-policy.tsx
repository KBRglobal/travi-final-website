import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Cookie } from "lucide-react";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { SEOHead } from "@/components/seo-head";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { useCookieConsent } from "@/contexts/cookie-consent-context";
import { Button } from "@/components/ui/button";

export default function CookiePolicy() {
  const { locale, isRTL } = useLocale();
  const { openSettings } = useCookieConsent();
  
  const title = locale === 'he' ? 'מדיניות עוגיות' : 'Cookie Policy';
  const metaTitle = `${title} | TRAVI World`;
  const metaDescription = locale === 'he' 
    ? 'מדיניות העוגיות של TRAVI World - כיצד אנחנו משתמשים בעוגיות באתר שלנו'
    : 'TRAVI World Cookie Policy - How we use cookies on our travel platform';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <SubtleSkyBackground />
      <SEOHead 
        title={metaTitle}
        description={metaDescription}
        canonicalPath="/cookie-policy"
      />
      <PublicNav variant="transparent" />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[#6443F4] transition-colors mb-6" 
              data-testid="link-back-home"
            >
              <ArrowLeft className="w-4 h-4" />
              {locale === 'he' ? 'חזרה לדף הבית' : 'Back to Home'}
            </Link>
          </motion.div>

          <motion.article 
            className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-p:text-slate-600 dark:prose-p:text-slate-400 prose-li:text-slate-600 dark:prose-li:text-slate-400 prose-a:text-[#6443F4] prose-strong:text-slate-900 dark:prose-strong:text-slate-100" 
            dir={isRTL ? 'rtl' : 'ltr'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#6443F4]/10 flex items-center justify-center">
                <Cookie className="w-6 h-6 text-[#6443F4]" />
              </div>
              <h1 
                className="m-0 text-3xl md:text-4xl text-slate-900 dark:text-slate-100" 
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                data-testid="text-page-title"
              >
                {title}
              </h1>
            </div>
            
            <p className="text-slate-500 dark:text-slate-500 text-sm mb-8">
              {locale === 'he' ? 'תאריך תוקף: 1 בינואר 2026' : 'Effective Date: 1 January 2026'}
            </p>

            <p>
              {locale === 'he' 
                ? 'מדיניות עוגיות זו מסבירה כיצד KBR Global Creative Consulting Ltd ("TRAVI World", "אנחנו", "שלנו") משתמשת בעוגיות וטכנולוגיות דומות באתר https://travi.world ("האתר"). יש לקרוא מדיניות זו יחד עם מדיניות הפרטיות שלנו.'
                : 'This Cookie Policy explains how KBR Global Creative Consulting Ltd ("TRAVI World", "we", "us") uses cookies and similar technologies on https://travi.world (the "Website"). This policy should be read together with our Privacy Policy.'}
            </p>

            <h2 style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{locale === 'he' ? '1. מה הן עוגיות?' : '1. What Are Cookies?'}</h2>
            <p>
              {locale === 'he'
                ? 'עוגיות הן קבצי טקסט קטנים המאוחסנים במכשיר שלך (מחשב, טאבלט או נייד) כשאתה מבקר באתר. הן עוזרות לאתרים לזכור מידע על הביקור שלך, כמו העדפות והגדרות, מה שהופך את הביקור הבא שלך לקל ושימושי יותר.'
                : 'Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They help websites remember information about your visit, such as your preferences and settings, making your next visit easier and more useful.'}
            </p>
            <p>
              {locale === 'he'
                ? 'אנו משתמשים גם בטכנולוגיות דומות כמו פיקסלים, אחסון מקומי ואחסון סשן, הפועלים באופן דומה. במדיניות זו, אנו מתייחסים לכל הטכנולוגיות הללו יחד כ"עוגיות".'
                : 'We also use similar technologies such as pixels, local storage, and session storage, which function in a similar way. In this policy, we refer to all these technologies collectively as "cookies."'}
            </p>

            <h2 style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{locale === 'he' ? '2. סוגי העוגיות שאנו משתמשים בהן' : '2. Types of Cookies We Use'}</h2>
            
            <h3 style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{locale === 'he' ? '2.1 עוגיות חיוניות (תמיד פעילות)' : '2.1 Essential Cookies (Always Active)'}</h3>
            <p>
              {locale === 'he'
                ? 'עוגיות אלה נחוצות לתפקוד תקין של האתר. הן מאפשרות תכונות בסיסיות כמו ניווט בדפים, אבטחה וגישה לאזורים מאובטחים. האתר לא יכול לפעול כראוי ללא עוגיות אלה, ולא ניתן לבטל אותן.'
                : 'These cookies are necessary for the Website to function properly. They enable basic features like page navigation, security, and access to secure areas. The Website cannot function properly without these cookies, and they cannot be disabled.'}
            </p>
            
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-300">{locale === 'he' ? 'שם העוגיה' : 'Cookie Name'}</th>
                    <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-300">{locale === 'he' ? 'ספק' : 'Provider'}</th>
                    <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-300">{locale === 'he' ? 'מטרה' : 'Purpose'}</th>
                    <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-300">{locale === 'he' ? 'משך' : 'Duration'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="px-4 py-3">cookie_consent</td>
                    <td className="px-4 py-3">TRAVI World</td>
                    <td className="px-4 py-3">{locale === 'he' ? 'שומרת את העדפות העוגיות שלך' : 'Stores your cookie preferences'}</td>
                    <td className="px-4 py-3">{locale === 'he' ? 'שנה' : '1 year'}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">__cf_bm</td>
                    <td className="px-4 py-3">Cloudflare</td>
                    <td className="px-4 py-3">{locale === 'he' ? 'הגנה מפני בוטים ואבטחה' : 'Bot protection and security'}</td>
                    <td className="px-4 py-3">{locale === 'he' ? '30 דקות' : '30 minutes'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{locale === 'he' ? '2.2 עוגיות אנליטיקה (דורשות הסכמה)' : '2.2 Analytics Cookies (Require Consent)'}</h3>
            <p>
              {locale === 'he'
                ? 'עוגיות אלה עוזרות לנו להבין כיצד מבקרים מתקשרים עם האתר שלנו על ידי איסוף ודיווח מידע באופן אנונימי. זה עוזר לנו לשפר את התוכן וחוויית המשתמש שלנו. עוגיות אלה מוגדרות רק לאחר שתספק הסכמה.'
                : 'These cookies help us understand how visitors interact with our Website by collecting and reporting information anonymously. This helps us improve our contents and user experience. These cookies are only set after you provide consent.'}
            </p>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-300">{locale === 'he' ? 'שם העוגיה' : 'Cookie Name'}</th>
                    <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-300">{locale === 'he' ? 'ספק' : 'Provider'}</th>
                    <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-300">{locale === 'he' ? 'מטרה' : 'Purpose'}</th>
                    <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-300">{locale === 'he' ? 'משך' : 'Duration'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="px-4 py-3">_ga</td>
                    <td className="px-4 py-3">Google Analytics</td>
                    <td className="px-4 py-3">{locale === 'he' ? 'מזהה משתמשים ייחודיים' : 'Distinguishes unique users'}</td>
                    <td className="px-4 py-3">{locale === 'he' ? 'שנתיים' : '2 years'}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">_ga_[ID]</td>
                    <td className="px-4 py-3">Google Analytics</td>
                    <td className="px-4 py-3">{locale === 'he' ? 'שומרת על מצב הסשן' : 'Maintains session state'}</td>
                    <td className="px-4 py-3">{locale === 'he' ? 'שנתיים' : '2 years'}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">_gid</td>
                    <td className="px-4 py-3">Google Analytics</td>
                    <td className="px-4 py-3">{locale === 'he' ? 'מזהה משתמשים' : 'Distinguishes users'}</td>
                    <td className="px-4 py-3">{locale === 'he' ? '24 שעות' : '24 hours'}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">_gat</td>
                    <td className="px-4 py-3">Google Analytics</td>
                    <td className="px-4 py-3">{locale === 'he' ? 'מגביל קצב בקשות' : 'Throttles request rate'}</td>
                    <td className="px-4 py-3">{locale === 'he' ? 'דקה אחת' : '1 minute'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg text-sm">
              {locale === 'he'
                ? 'הערה: אנו משתמשים ב-Google Analytics עם הסתרת כתובות IP כדי להגן על פרטיותך. משמעות הדבר היא שכתובת ה-IP המלאה שלך לעולם לא נשמרת.'
                : 'Note: We use Google Analytics with IP anonymization enabled to protect your privacy. This means your full IP address is never stored.'}
            </div>

            <h2 style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{locale === 'he' ? '3. עוגיות צד שלישי' : '3. Third-Party Cookies'}</h2>
            <p>
              {locale === 'he'
                ? 'כאשר אתה לוחץ על קישורי שותפים באתר שלנו, אתה מופנה לאתרי צד שלישי (כמו Booking.com, Expedia, GetYourGuide וכו\'). אתרים אלה עשויים להגדיר עוגיות משלהם, הכפופות למדיניות הפרטיות והעוגיות שלהם. אין לנו שליטה על עוגיות צד שלישי אלה.'
                : 'When you click on affiliate links on our Website, you will be redirected to third-party websites (such as Booking.com, Expedia, GetYourGuide, etc.). These websites may set their own cookies, which are governed by their respective privacy and cookie policies. We have no control over these third-party cookies.'}
            </p>

            <h2 style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{locale === 'he' ? '4. ניהול העדפות העוגיות שלך' : '4. Managing Your Cookie Preferences'}</h2>
            <p>{locale === 'he' ? 'יש לך מספר אפשרויות לניהול עוגיות:' : 'You have several options for managing cookies:'}</p>

            <h3 style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{locale === 'he' ? '4.1 כלי הסכמת העוגיות שלנו' : '4.1 Our Cookie Consent Tool'}</h3>
            <p>
              {locale === 'he'
                ? 'כאשר אתה מבקר באתר שלנו לראשונה, תראה באנר עוגיות המאפשר לך לקבל או לדחות עוגיות לא חיוניות. תוכל לשנות את ההעדפות שלך בכל עת על ידי לחיצה על הקישור "הגדרות עוגיות" בתחתית האתר.'
                : 'When you first visit our Website, you will see a cookie banner that allows you to accept or reject non-essential cookies. You can change your preferences at any time by clicking the "Cookie Settings" link in the website footer.'}
            </p>
            
            <div className="not-prose my-6">
              <Button 
                onClick={openSettings}
                className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white"
                data-testid="button-open-cookie-settings"
              >
                {locale === 'he' ? 'פתח הגדרות עוגיות' : 'Open Cookie Settings'}
              </Button>
            </div>

            <h3 style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{locale === 'he' ? '4.2 הגדרות דפדפן' : '4.2 Browser Settings'}</h3>
            <p>
              {locale === 'he'
                ? 'רוב דפדפני האינטרנט מאפשרים לך לשלוט בעוגיות דרך ההגדרות שלהם. בדרך כלל תוכל:'
                : 'Most web browsers allow you to control cookies through their settings. You can typically:'}
            </p>
            <ul>
              <li>{locale === 'he' ? 'לצפות באילו עוגיות מאוחסנות במכשיר שלך' : 'View what cookies are stored on your device'}</li>
              <li>{locale === 'he' ? 'למחוק את כל העוגיות או עוגיות ספציפיות' : 'Delete all or specific cookies'}</li>
              <li>{locale === 'he' ? 'לחסום את כל העוגיות או רק עוגיות צד שלישי' : 'Block all cookies or only third-party cookies'}</li>
              <li>{locale === 'he' ? 'להגדיר את הדפדפן שלך להודיע לך כאשר עוגיה מוגדרת' : 'Set your browser to notify you when a cookie is set'}</li>
            </ul>

            <h3 style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{locale === 'he' ? '4.3 כלי ביטול' : '4.3 Opt-Out Tools'}</h3>
            <p>
              {locale === 'he'
                ? 'תוכל לבטל את מעקב Google Analytics על ידי התקנת תוסף הדפדפן לביטול Google Analytics:'
                : 'You can opt out of Google Analytics tracking by installing the Google Analytics Opt-out Browser Add-on:'}
            </p>
            <p>
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">
                https://tools.google.com/dlpage/gaoptout
              </a>
            </p>

            <h2 style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{locale === 'he' ? '5. השפעת חסימת עוגיות' : '5. Impact of Blocking Cookies'}</h2>
            <p>{locale === 'he' ? 'אם תבחר לחסום או למחוק עוגיות, שים לב:' : 'If you choose to block or delete cookies, please note that:'}</p>
            <ul>
              <li>{locale === 'he' ? 'לא ניתן לבטל עוגיות חיוניות מכיוון שהן נחוצות לתפקוד האתר' : 'Essential cookies cannot be disabled as they are necessary for the Website to function'}</li>
              <li>{locale === 'he' ? 'חסימת עוגיות אנליטיקה לא תשפיע על יכולתך להשתמש באתר' : 'Blocking analytics cookies will not affect your ability to use the Website'}</li>
              <li>{locale === 'he' ? 'העדפות העוגיות שלך עשויות להתאפס אם תמחק את העוגיה השומרת את הבחירות שלך' : 'Your cookie preferences may be reset if you delete the cookie that stores your choices'}</li>
              <li>{locale === 'he' ? 'ייתכן שחלק מהתכונות לא יפעלו כמתוכנן' : 'Some features may not work as intended'}</li>
            </ul>

            <h2 style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{locale === 'he' ? '6. עדכונים למדיניות זו' : '6. Updates to This Policy'}</h2>
            <p>
              {locale === 'he'
                ? 'אנו עשויים לעדכן מדיניות עוגיות זו מעת לעת כדי לשקף שינויים בנוהגים שלנו או מסיבות תפעוליות, משפטיות או רגולטוריות אחרות. "תאריך התוקף" בראש מדיניות זו מציין מתי היא עודכנה לאחרונה. אנו ממליצים לעיין במדיניות זו מעת לעת.'
                : 'We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. The "Effective Date" at the top of this policy indicates when it was last updated. We encourage you to review this policy periodically.'}
            </p>

            <h2 style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{locale === 'he' ? '7. צור קשר' : '7. Contact Us'}</h2>
            <p>{locale === 'he' ? 'אם יש לך שאלות לגבי השימוש שלנו בעוגיות, אנא צור קשר:' : 'If you have any questions about our use of cookies, please contact us:'}</p>
            <p>
              <strong>{locale === 'he' ? 'דוא"ל:' : 'Email:'}</strong> privacy@travi.world
            </p>
            <p>
              <strong>{locale === 'he' ? 'כתובת:' : 'Postal Address:'}</strong> KBR Global Creative Consulting Ltd, Suite 4.3.02, Block 4, Eurotowers, Gibraltar GX11 1AA, Gibraltar
            </p>

            <hr className="my-8 border-slate-200 dark:border-slate-800" />

            <p className="text-sm text-slate-500 dark:text-slate-500">
              {locale === 'he' 
                ? '2026 TRAVI World. כל הזכויות שמורות. מופעל על ידי KBR Global Creative Consulting Ltd, גיברלטר (מספר חברה: 125571)'
                : '2026 TRAVI World. All rights reserved. Operated by KBR Global Creative Consulting Ltd, Gibraltar (Company No. 125571)'}
            </p>
          </motion.article>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
