import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Check, Globe, ChevronDown } from "lucide-react";
import { SiInstagram, SiTelegram } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { Helmet } from "react-helmet-async";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const fullLogo = "/logos/Full_Logo_for_Dark_Background.svg";
const mascot = "/logos/Mascot_for_Dark_Background.png";

type Language = "en" | "ar" | "fr" | "de" | "es" | "ru" | "zh" | "ja" | "ko" | "hi";

const languageNames: Record<Language, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  ru: "Русский",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  hi: "हिन्दी",
};

const translations: Record<Language, {
  comingSoon: string;
  tagline: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  emailPlaceholder: string;
  notifyMe: string;
  subscribed: string;
  noSpam: string;
  invalidEmail: string;
  successTitle: string;
  successDescription: string;
  errorTitle: string;
  errorDescription: string;
}> = {
  en: {
    comingSoon: "Coming Soon",
    tagline: "We're about to change the world of tourism forever. Get ready for a revolutionary travel experience.",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",
    emailPlaceholder: "Enter your email",
    notifyMe: "Notify Me",
    subscribed: "Subscribed!",
    noSpam: "Be the first to know when we launch. No spam, we promise.",
    invalidEmail: "Please enter a valid email address",
    successTitle: "Success!",
    successDescription: "You're on the list. We'll notify you when we launch!",
    errorTitle: "Error",
    errorDescription: "Something went wrong. Please try again.",
  },
  ar: {
    comingSoon: "قريباً",
    tagline: "نحن على وشك تغيير عالم السياحة للأبد. استعد لتجربة سفر ثورية.",
    days: "أيام",
    hours: "ساعات",
    minutes: "دقائق",
    seconds: "ثواني",
    emailPlaceholder: "أدخل بريدك الإلكتروني",
    notifyMe: "أبلغني",
    subscribed: "تم الاشتراك!",
    noSpam: "كن أول من يعلم عند إطلاقنا. لا رسائل مزعجة، نعدك.",
    invalidEmail: "يرجى إدخال بريد إلكتروني صحيح",
    successTitle: "نجاح!",
    successDescription: "أنت في القائمة. سنخبرك عند الإطلاق!",
    errorTitle: "خطأ",
    errorDescription: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
  },
  fr: {
    comingSoon: "Bientôt Disponible",
    tagline: "Nous sommes sur le point de changer le monde du tourisme pour toujours. Préparez-vous à une expérience de voyage révolutionnaire.",
    days: "Jours",
    hours: "Heures",
    minutes: "Minutes",
    seconds: "Secondes",
    emailPlaceholder: "Entrez votre email",
    notifyMe: "Me Notifier",
    subscribed: "Inscrit!",
    noSpam: "Soyez le premier à savoir quand nous lançons. Pas de spam, promis.",
    invalidEmail: "Veuillez entrer une adresse email valide",
    successTitle: "Succès!",
    successDescription: "Vous êtes sur la liste. Nous vous informerons lors du lancement!",
    errorTitle: "Erreur",
    errorDescription: "Une erreur s'est produite. Veuillez réessayer.",
  },
  de: {
    comingSoon: "Demnächst Verfügbar",
    tagline: "Wir werden die Welt des Tourismus für immer verändern. Machen Sie sich bereit für ein revolutionäres Reiseerlebnis.",
    days: "Tage",
    hours: "Stunden",
    minutes: "Minuten",
    seconds: "Sekunden",
    emailPlaceholder: "E-Mail eingeben",
    notifyMe: "Benachrichtigen",
    subscribed: "Abonniert!",
    noSpam: "Seien Sie der Erste, der von unserem Start erfährt. Kein Spam, versprochen.",
    invalidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
    successTitle: "Erfolg!",
    successDescription: "Sie sind auf der Liste. Wir benachrichtigen Sie beim Start!",
    errorTitle: "Fehler",
    errorDescription: "Etwas ist schief gelaufen. Bitte versuchen Sie es erneut.",
  },
  es: {
    comingSoon: "Próximamente",
    tagline: "Estamos a punto de cambiar el mundo del turismo para siempre. Prepárate para una experiencia de viaje revolucionaria.",
    days: "Días",
    hours: "Horas",
    minutes: "Minutos",
    seconds: "Segundos",
    emailPlaceholder: "Ingresa tu email",
    notifyMe: "Notifícame",
    subscribed: "¡Suscrito!",
    noSpam: "Sé el primero en saber cuando lancemos. Sin spam, lo prometemos.",
    invalidEmail: "Por favor ingresa un email válido",
    successTitle: "¡Éxito!",
    successDescription: "Estás en la lista. ¡Te notificaremos cuando lancemos!",
    errorTitle: "Error",
    errorDescription: "Algo salió mal. Por favor intenta de nuevo.",
  },
  ru: {
    comingSoon: "Скоро Открытие",
    tagline: "Мы собираемся навсегда изменить мир туризма. Приготовьтесь к революционному опыту путешествий.",
    days: "Дней",
    hours: "Часов",
    minutes: "Минут",
    seconds: "Секунд",
    emailPlaceholder: "Введите email",
    notifyMe: "Уведомить",
    subscribed: "Подписано!",
    noSpam: "Будьте первым, кто узнает о запуске. Без спама, обещаем.",
    invalidEmail: "Пожалуйста, введите корректный email",
    successTitle: "Успех!",
    successDescription: "Вы в списке. Мы уведомим вас о запуске!",
    errorTitle: "Ошибка",
    errorDescription: "Что-то пошло не так. Пожалуйста, попробуйте снова.",
  },
  zh: {
    comingSoon: "即将推出",
    tagline: "我们即将永远改变旅游业。准备好迎接革命性的旅行体验。",
    days: "天",
    hours: "小时",
    minutes: "分钟",
    seconds: "秒",
    emailPlaceholder: "输入您的邮箱",
    notifyMe: "通知我",
    subscribed: "已订阅！",
    noSpam: "成为第一个知道我们发布的人。我们承诺不发送垃圾邮件。",
    invalidEmail: "请输入有效的邮箱地址",
    successTitle: "成功！",
    successDescription: "您已加入名单。发布时我们会通知您！",
    errorTitle: "错误",
    errorDescription: "出了点问题。请重试。",
  },
  ja: {
    comingSoon: "近日公開",
    tagline: "私たちは観光の世界を永遠に変えようとしています。革命的な旅行体験の準備をしてください。",
    days: "日",
    hours: "時間",
    minutes: "分",
    seconds: "秒",
    emailPlaceholder: "メールアドレスを入力",
    notifyMe: "通知する",
    subscribed: "登録完了！",
    noSpam: "ローンチ時に最初にお知らせします。スパムはお送りしません。",
    invalidEmail: "有効なメールアドレスを入力してください",
    successTitle: "成功！",
    successDescription: "リストに登録されました。ローンチ時にお知らせします！",
    errorTitle: "エラー",
    errorDescription: "問題が発生しました。もう一度お試しください。",
  },
  ko: {
    comingSoon: "곧 출시",
    tagline: "우리는 관광의 세계를 영원히 바꾸려 합니다. 혁신적인 여행 경험을 준비하세요.",
    days: "일",
    hours: "시간",
    minutes: "분",
    seconds: "초",
    emailPlaceholder: "이메일 입력",
    notifyMe: "알림 받기",
    subscribed: "구독 완료!",
    noSpam: "출시 소식을 가장 먼저 받아보세요. 스팸 없음을 약속합니다.",
    invalidEmail: "유효한 이메일 주소를 입력해주세요",
    successTitle: "성공!",
    successDescription: "목록에 등록되었습니다. 출시 시 알려드리겠습니다!",
    errorTitle: "오류",
    errorDescription: "문제가 발생했습니다. 다시 시도해 주세요.",
  },
  hi: {
    comingSoon: "जल्द आ रहा है",
    tagline: "हम पर्यटन की दुनिया को हमेशा के लिए बदलने वाले हैं। क्रांतिकारी यात्रा अनुभव के लिए तैयार हो जाइए।",
    days: "दिन",
    hours: "घंटे",
    minutes: "मिनट",
    seconds: "सेकंड",
    emailPlaceholder: "ईमेल दर्ज करें",
    notifyMe: "मुझे सूचित करें",
    subscribed: "सब्सक्राइब्ड!",
    noSpam: "लॉन्च होने पर सबसे पहले जानें। कोई स्पैम नहीं, वादा है।",
    invalidEmail: "कृपया एक मान्य ईमेल पता दर्ज करें",
    successTitle: "सफलता!",
    successDescription: "आप सूची में हैं। लॉन्च होने पर हम आपको सूचित करेंगे!",
    errorTitle: "त्रुटि",
    errorDescription: "कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
  },
};

export default function ComingSoon() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const t = translations[language];
  const isRTL = language === "ar";

  // Update email error message when language changes
  useEffect(() => {
    if (emailError) {
      setEmailError(t.invalidEmail);
    }
  }, [language, t.invalidEmail]);

  useEffect(() => {
    // Launch date: December 31, 2024 at 23:59:59 (midnight)
    const launchDate = new Date('2024-12-31T23:59:59');

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = launchDate.getTime() - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError(t.invalidEmail);
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !validateEmail(email)) {
      setEmailError(t.invalidEmail);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/newsletter/subscribe", { email });
      setIsSubscribed(true);
      toast({
        title: t.successTitle,
        description: t.successDescription
      });
      setEmail("");
      setTimeout(() => setIsSubscribed(false), 3000);
    } catch (error) {
      toast({
        title: t.errorTitle,
        description: t.errorDescription,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const CountdownBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-white/70 backdrop-blur-sm border border-white/40 rounded-lg p-3 md:p-5 min-w-[60px] md:min-w-[90px] shadow-lg">
        <span className="text-2xl md:text-4xl font-bold text-[#1E1B4B]">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[#1E1B4B]/70 text-xs md:text-sm mt-2">{label}</span>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Coming Soon | TRAVI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <div 
        className={`min-h-screen flex flex-col p-4 md:p-6 overflow-hidden relative sky-gradient ${isRTL ? "rtl" : "ltr"}`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <style>{`
        @keyframes successPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes mascotFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      {/* Floating decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Floating clouds */}
        <div className="absolute top-[10%] left-[5%] w-20 h-10 bg-white/40 rounded-full animate-cloud-drift" />
        <div className="absolute top-[15%] right-[10%] w-32 h-14 bg-white/30 rounded-full animate-cloud-drift animation-delay-1000" />
        <div className="absolute top-[25%] left-[15%] w-24 h-12 bg-white/35 rounded-full animate-cloud-drift animation-delay-2000" />
        
        {/* Twinkling stars/sparkles */}
        <div className="absolute top-[20%] left-[30%] w-2 h-2 bg-white rounded-full" style={{ animation: "twinkle 2s ease-in-out infinite" }} />
        <div className="absolute top-[35%] right-[25%] w-1.5 h-1.5 bg-white rounded-full" style={{ animation: "twinkle 2.5s ease-in-out infinite 0.5s" }} />
        <div className="absolute top-[15%] right-[40%] w-2 h-2 bg-white rounded-full" style={{ animation: "twinkle 3s ease-in-out infinite 1s" }} />
        <div className="absolute bottom-[30%] left-[20%] w-1.5 h-1.5 bg-white rounded-full" style={{ animation: "twinkle 2s ease-in-out infinite 1.5s" }} />
        <div className="absolute bottom-[40%] right-[15%] w-2 h-2 bg-white rounded-full" style={{ animation: "twinkle 2.5s ease-in-out infinite 0.8s" }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <img 
          src={fullLogo} 
          alt="Travi" 
          className="h-12 md:h-16 w-auto"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full px-4 py-2 text-[#1E1B4B] text-sm transition-colors"
              data-testid="button-language-toggle"
            >
              <Globe className="w-4 h-4" />
              <span>{languageNames[language]}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
            {(Object.keys(languageNames) as Language[]).map((lang) => (
              <DropdownMenuItem
                key={lang}
                onClick={() => setLanguage(lang)}
                className={language === lang ? "bg-accent" : ""}
                data-testid={`menu-item-language-${lang}`}
              >
                {languageNames[lang]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div className="max-w-3xl w-full text-center space-y-6">
          {/* Mascot with float animation */}
          <div className="flex justify-center mb-4">
            <img 
              src={mascot} 
              alt="Travi Mascot" 
              className="w-32 h-32 md:w-48 md:h-48 object-contain"
              style={{ animation: "mascotFloat 4s ease-in-out infinite" }}
              data-testid="img-mascot"
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl md:text-5xl font-bold text-[#1E1B4B]">
              {t.comingSoon}
            </h2>
            <p className="text-base md:text-xl text-[#1E1B4B]/80 max-w-lg mx-auto">
              {t.tagline}
            </p>
          </div>

          <div className="flex justify-center gap-2 md:gap-4 py-4">
            <CountdownBox value={timeLeft.days} label={t.days} />
            <CountdownBox value={timeLeft.hours} label={t.hours} />
            <CountdownBox value={timeLeft.minutes} label={t.minutes} />
            <CountdownBox value={timeLeft.seconds} label={t.seconds} />
          </div>

          <form id="newsletter-form" onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground`} />
              <Input
                type="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={handleEmailChange}
                className={`${isRTL ? "pr-10" : "pl-10"} h-12 bg-white border-0 ${emailError ? "ring-2 ring-red-500" : ""}`}
                data-testid="input-newsletter-email"
                required
              />
              {emailError && (
                <p className={`absolute ${isRTL ? "right-0" : "left-0"} -bottom-5 text-xs text-red-600`}>
                  {emailError}
                </p>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={isSubmitting || isSubscribed}
              className={`h-12 px-6 text-white border transition-all duration-300 ${
                isSubscribed 
                  ? "bg-green-500 border-green-500" 
                  : "bg-[#24103E] border-[#24103E]"
              }`}
              style={isSubscribed ? { animation: "successPulse 0.5s ease-in-out" } : undefined}
              data-testid="button-newsletter-subscribe"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSubscribed ? (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {t.subscribed}
                </span>
              ) : (
                t.notifyMe
              )}
            </Button>
          </form>

          <p className="text-[#1E1B4B]/60 text-sm mt-8">
            {t.noSpam}
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <a 
              href="https://instagram.com/travi_world" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 bg-[#1E1B4B]/10 hover:bg-[#1E1B4B]/20 rounded-full flex items-center justify-center transition-colors"
              data-testid="link-social-instagram"
            >
              <SiInstagram className="w-5 h-5 text-[#1E1B4B]" />
            </a>
            <a 
              href="https://t.me/TraviAi_bot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 bg-[#1E1B4B]/10 hover:bg-[#1E1B4B]/20 rounded-full flex items-center justify-center transition-colors"
              data-testid="link-social-telegram"
            >
              <SiTelegram className="w-5 h-5 text-[#1E1B4B]" />
            </a>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
