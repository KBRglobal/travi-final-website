import { useTranslation } from "react-i18next";
import { Mascot } from "@/components/logo";
import { heroAnimationStyles } from "./homepage-data";

export function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-950">
      <style>{heroAnimationStyles}</style>
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-4 loading-pulse">
          <Mascot size={96} variant="light-bg" />
        </div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">{t("common.loading")}</p>
      </div>
    </div>
  );
}
