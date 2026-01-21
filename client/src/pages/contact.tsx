import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { useLocale } from "@/hooks/use-locale";
import { 
  Mail, MapPin, Globe, Clock, HelpCircle, 
  Building2, MessageSquare, Shield, Send, Sparkles
} from "lucide-react";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};

export default function ContactPage() {
  const { t } = useTranslation();
  const { isRTL } = useLocale();

  useDocumentMeta({
    title: t("pages.contact.metaTitle"),
    description: t("pages.contact.metaDescription"),
  });

  const contactOptions = [
    {
      icon: Mail,
      title: t("pages.contact.options.generalInquiries.title"),
      description: t("pages.contact.options.generalInquiries.description"),
      action: "info@travi.world",
      href: "mailto:info@travi.world",
      testId: "link-contact-email",
    },
    {
      icon: Shield,
      title: t("pages.contact.options.privacyInquiries.title"),
      description: t("pages.contact.options.privacyInquiries.description"),
      action: "privacy@travi.world",
      href: "mailto:privacy@travi.world",
      testId: "link-privacy-email",
    },
    {
      icon: Globe,
      title: t("pages.contact.options.visitWebsite.title"),
      description: t("pages.contact.options.visitWebsite.description"),
      action: "travi.world",
      href: "https://travi.world",
      testId: "link-contact-website",
    },
    {
      icon: Clock,
      title: t("pages.contact.options.responseTime.title"),
      description: t("pages.contact.options.responseTime.description"),
      action: t("pages.contact.options.responseTime.action"),
      href: null,
      testId: "text-response-time",
    },
  ];

  const helpTopics = [
    t("pages.contact.helpTopics.general"),
    t("pages.contact.helpTopics.feedback"),
    t("pages.contact.helpTopics.reporting"),
    t("pages.contact.helpTopics.business"),
    t("pages.contact.helpTopics.media"),
    t("pages.contact.helpTopics.privacy"),
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950" dir={isRTL ? "rtl" : "ltr"}>
      <SubtleSkyBackground />
      <PublicNav variant="transparent" />

      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <motion.div 
              className="flex-1 text-center lg:text-start"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.div 
                variants={fadeInUp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 mb-6"
              >
                <Sparkles className="w-4 h-4 text-[#6443F4]" />
                <span className="text-sm font-medium text-[#6443F4] dark:text-[#6443F4]">{t("pages.contact.badge")}</span>
              </motion.div>

              <motion.h1 
                variants={fadeInUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                data-testid="heading-contact"
              >
                <span className="text-slate-900 dark:text-white">{t("pages.contact.titlePart1")} </span>
                <span className="text-[#6443F4]">{t("pages.contact.titlePart2")}</span>
              </motion.h1>

              <motion.p 
                variants={fadeInUp}
                className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 mb-8"
              >
                {t("pages.contact.subtitle")}
              </motion.p>

              <motion.a 
                variants={fadeInUp}
                href="mailto:info@travi.world"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white font-medium shadow-lg shadow-[#6443F4]/25 transition-all duration-300"
                data-testid="button-send-message"
              >
                <Send className="w-5 h-5" />
                {t("pages.contact.cta")}
              </motion.a>
            </motion.div>

            <motion.div 
              className="flex-1 relative"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl" />
                
                <img 
                  src="/hero/travi-world-mascot-canyon-viewpoint.webp"
                  alt="Travi mascot at a scenic canyon viewpoint"
                  className="relative w-full max-w-md mx-auto rounded-2xl shadow-xl"
                  data-testid="img-mascot"
                />

                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full shadow-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#6443F4]" />
                    <span className="font-medium text-slate-900 dark:text-white">{t("pages.contact.travelCompanion")}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-slate-950" data-testid="section-contact-info">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 
              className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              {t("pages.contact.getInTouch")}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              {t("pages.contact.getInTouchSubtitle")}
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {contactOptions.map((option, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group relative bg-white dark:bg-slate-900 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                data-testid={`card-contact-${option.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-14 h-14 rounded-xl bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <option.icon className="w-7 h-7 text-[#6443F4]" />
                </div>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {option.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {option.description}
                </p>

                {option.href ? (
                  <a 
                    href={option.href}
                    className="text-[#6443F4] dark:text-[#6443F4] font-medium hover:underline inline-flex items-center gap-1"
                    data-testid={option.testId}
                  >
                    {option.action}
                  </a>
                ) : (
                  <span 
                    className="text-slate-700 dark:text-slate-300 font-medium"
                    data-testid={option.testId}
                  >
                    {option.action}
                  </span>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-slate-50 dark:bg-slate-900" data-testid="section-help-topics">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-12 h-12 rounded-xl bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center mb-6">
                <HelpCircle className="w-6 h-6 text-[#6443F4]" />
              </div>

              <h2 
                className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                {t("pages.contact.howCanWeHelp")}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                {t("pages.contact.howCanWeHelpSubtitle")}
              </p>

              <ul className="space-y-4">
                {helpTopics.map((topic, index) => (
                  <motion.li 
                    key={index} 
                    className="flex items-start gap-4 group"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="w-6 h-6 rounded-full bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#6443F4] transition-all duration-300">
                      <div className="w-2 h-2 rounded-full bg-[#6443F4] group-hover:bg-white transition-colors" />
                    </div>
                    <span className="text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      {topic}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              className="relative" 
              data-testid="section-important-notes"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative bg-white dark:bg-slate-800 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                      {t("pages.contact.importantNote")}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {t("pages.contact.importantNoteSubtitle")}
                    </p>
                  </div>
                </div>

                {/* OUT_OF_SCOPE: Legal body text */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5">
                  <p className="text-amber-800 dark:text-amber-200 text-sm leading-relaxed">
                    <strong>TRAVI World</strong> is an independent travel information resource. 
                    We do not provide booking services, travel agency services, or payment processing. 
                    For booking-related inquiries, refunds, or service issues, please contact the respective 
                    hotels, airlines, tour operators, or booking platforms directly.
                  </p>
                </div>

                <p className="mt-5 text-sm text-slate-600 dark:text-slate-400">
                  {t("pages.contact.urgentNote", { urgentLabel: `"${t("pages.contact.urgentLabel")}"` })}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-slate-950" data-testid="section-postal-address">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="relative"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative bg-white dark:bg-slate-900 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="flex flex-col md:flex-row items-start gap-8">
                <div className="w-16 h-16 rounded-2xl bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-8 h-8 text-[#6443F4]" />
                </div>

                <div className="flex-1">
                  <h2 
                    className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    {t("pages.contact.ourOffice")}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {t("pages.contact.ourOfficeSubtitle")}
                  </p>

                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-[#6443F4] mt-1 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        KBR Global Creative Consulting Ltd
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">Company No. 125571</p>
                      <p className="text-slate-600 dark:text-slate-400">Suite 4.3.02, Block 4, Eurotowers</p>
                      <p className="text-slate-600 dark:text-slate-400">Gibraltar GX11 1AA</p>
                      <p className="text-slate-600 dark:text-slate-400">Gibraltar</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
