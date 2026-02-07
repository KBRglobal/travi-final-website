/**
 * NewsletterSection - Glassmorphism Newsletter Signup
 * Premium, playful newsletter signup with full-bleed background image
 * and glass card overlay. CMS-editable contents.
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface NewsletterConfig {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  placeholder?: string;
  buttonText?: string;
  backgroundImage?: string;
}

interface NewsletterSectionProps {
  config?: NewsletterConfig;
}

const defaultConfig: NewsletterConfig = {
  eyebrow: "Join the Adventure",
  headline: "Get Travel Magic in Your Inbox",
  subheadline: "Weekly tips, hidden gems, and exclusive deals - no spam, just wanderlust.",
  placeholder: "your@email.com",
  buttonText: "Subscribe",
  backgroundImage: "/newsletter/home-newsletter-duck-surfing-wave.webp",
};

export function NewsletterSection({ config = defaultConfig }: NewsletterSectionProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/newsletter/subscribe", { email });
      setIsSubscribed(true);
      setEmail("");
      toast({
        title: "Welcome aboard!",
        description: "You're now subscribed to travel magic.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Oops!",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const {
    eyebrow = defaultConfig.eyebrow,
    headline = defaultConfig.headline,
    subheadline = defaultConfig.subheadline,
    placeholder = defaultConfig.placeholder,
    buttonText = defaultConfig.buttonText,
    backgroundImage = defaultConfig.backgroundImage,
  } = config;

  return (
    <section className="relative py-20 md:py-28 overflow-hidden" data-testid="newsletter-section">
      {/* Full-bleed Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={backgroundImage}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          width={1920}
          height={600}
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* Content Container - Positioned left to keep character visible on right */}
      <div className="relative z-10 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.8,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="max-w-xl ml-0 md:ml-8 lg:ml-16 mr-auto"
        >
          {/* Glass Card - Reduced blur for better character visibility */}
          <motion.div
            whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-3xl p-8 md:p-10"
            style={{
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
            }}
            data-testid="newsletter-glass-card"
          >
            {/* Eyebrow */}
            {eyebrow && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="flex items-center justify-center gap-2 mb-4"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold tracking-widest uppercase text-slate-700">
                  {eyebrow}
                </span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </motion.div>
            )}

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-3 text-slate-800 font-chillax"
              data-testid="newsletter-headline"
            >
              {headline}
            </motion.h2>

            {/* Subheadline */}
            {subheadline && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-center text-slate-600 mb-8 text-base md:text-lg"
                data-testid="newsletter-subheadline"
              >
                {subheadline}
              </motion.p>
            )}

            {/* Form */}
            {!isSubscribed ? (
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.5 }}
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3"
                data-testid="newsletter-form"
              >
                <div className="flex-1 relative">
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={placeholder}
                    className="w-full h-12 sm:h-14 px-5 text-base rounded-full bg-white/80 backdrop-blur-sm border-white/50 shadow-sm focus:border-[#6443F4] focus:ring-[#6443F4] placeholder:text-slate-400"
                    disabled={isLoading}
                    data-testid="input-newsletter-email"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 sm:h-14 px-8 rounded-full text-base font-semibold transition-all duration-300 bg-[#6443F4] hover:bg-[#5539d4] text-white"
                  style={{
                    boxShadow: "0 4px 20px rgba(100, 67, 244, 0.3)",
                  }}
                  data-testid="button-newsletter-subscribe"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      {buttonText}
                      <Send className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </motion.form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
                data-testid="newsletter-success"
              >
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500/20 text-green-700 font-medium">
                  <Sparkles className="w-5 h-5" />
                  You're subscribed! Check your inbox.
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
