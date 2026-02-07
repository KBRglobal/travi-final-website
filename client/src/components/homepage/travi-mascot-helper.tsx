import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mascot } from "@/components/logo";
import { LiveChatWidget } from "@/components/live-chat-widget";

export function TraviMascotHelper() {
  const { t } = useTranslation("common");
  const [isVisible, setIsVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-center gap-1 animate-bounce-in">
        <button
          onClick={() => setIsChatOpen(true)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-travi-purple to-[#8B5CF6] p-0.5 sm:p-1 shadow-lg shadow-travi-purple/30 overflow-hidden transition-all hover:shadow-xl hover:scale-105 active:scale-95"
          aria-label="Open chat with TRAVI assistant"
          title="Chat with TRAVI travel assistant"
        >
          <Mascot size={64} variant="light-bg" />
        </button>
        <span className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-full shadow-sm">
          {t("home.chatWithUs", "Chat with us")}
        </span>
      </div>

      <LiveChatWidget isOpen={isChatOpen} onOpenChange={setIsChatOpen} showFloatingButton={false} />
    </>
  );
}
