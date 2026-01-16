import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Send, CheckCircle, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NewsletterSignupProps {
  backgroundImage?: string;
  className?: string;
}

const defaultBgImage =
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&h=600&fit=crop";

export function NewsletterSignup({
  backgroundImage = defaultBgImage,
  className = "",
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  const subscribeMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      return apiRequest("POST", "/api/newsletter/subscribe", { email: emailAddress });
    },
    onSuccess: () => {
      setIsSubscribed(true);
      setEmail("");
      toast({
        title: "Successfully subscribed!",
        description: "Welcome to the Travi community. You'll hear from us soon!",
      });
    },
    onError: () => {
      toast({
        title: "Subscription failed",
        description: "Please try again or check if you're already subscribed.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      subscribeMutation.mutate(email);
    }
  };

  return (
    <section
      className={`relative py-20 lg:py-28 overflow-hidden ${className}`}
      data-testid="newsletter-signup-section"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-[#6443F4]/90" />
      </div>

      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-[#F4C542]/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
          <Mail className="w-4 h-4 text-white" />
          <span className="text-white/90 text-sm font-medium">Join 50,000+ travelers</span>
        </div>

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
          Subscribe to our{" "}
          <span
            className="italic font-normal"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Newsletter
          </span>
        </h2>

        <p className="text-white/80 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Get exclusive travel tips, hidden gems, and the latest Dubai insights 
          delivered straight to your inbox. No spam, just inspiration.
        </p>

        {isSubscribed ? (
          <div
            className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4"
            data-testid="newsletter-success-message"
          >
            <CheckCircle className="w-6 h-6 text-travi-green" />
            <span className="text-white font-medium">
              You're all set! Welcome to the Travi family.
            </span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto"
            data-testid="newsletter-form"
          >
            <div className="flex-1 relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-14 bg-white/95 border-0 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-white/50"
                required
                data-testid="input-newsletter-email"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={subscribeMutation.isPending}
              className="h-14 px-8 bg-[#F4C542] text-white border-0 font-semibold gap-2"
              data-testid="button-newsletter-subscribe"
            >
              {subscribeMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Subscribe
                  <Send className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        )}

        <p className="mt-6 text-white/60 text-sm">
          By subscribing, you agree to our Privacy Policy. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}
