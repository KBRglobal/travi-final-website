import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { Users, DollarSign, Link2, CheckCircle, Copy } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
});

type RegisterForm = z.infer<typeof registerSchema>;

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function PartnersJoin() {
  const { toast } = useToast();
  const [result, setResult] = useState<{ partnerCode: string; referralLink: string } | null>(null);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const response = await apiRequest("POST", "/api/referrals/register", data);
      return response.json();
    },
    onSuccess: (data) => {
      setResult({
        partnerCode: data.partnerCode,
        referralLink: data.referralLink,
      });
      toast({
        title: "Welcome to the partner program!",
        description: "Your referral link is ready to share.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard.",
    });
  };

  if (result) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
        <SubtleSkyBackground />
        <PublicNav variant="transparent" />

        <main className="flex-1 pt-24 pb-16">
          <motion.div 
            className="container mx-auto px-4 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="text-center">
                <motion.div 
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                >
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </motion.div>
                <CardTitle 
                  className="text-2xl text-slate-900 dark:text-slate-100"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  data-testid="text-success-title"
                >
                  Welcome to the Partner Program!
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Share your referral link to start earning commissions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Your Partner Code</label>
                  <div className="flex gap-2">
                    <Input 
                      value={result.partnerCode} 
                      readOnly 
                      data-testid="input-partner-code"
                      className="font-mono bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => copyToClipboard(result.partnerCode)}
                      data-testid="button-copy-code"
                      className="border-slate-200 dark:border-slate-700"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Your Referral Link</label>
                  <div className="flex gap-2">
                    <Input 
                      value={result.referralLink} 
                      readOnly 
                      data-testid="input-referral-link"
                      className="font-mono text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => copyToClipboard(result.referralLink)}
                      data-testid="button-copy-link"
                      className="border-slate-200 dark:border-slate-700"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <Button 
                    onClick={() => window.location.href = `/partners/dashboard?code=${result.partnerCode}`}
                    data-testid="button-go-dashboard"
                    className="w-full rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white"
                  >
                    Go to Dashboard
                  </Button>
                  <p className="text-sm text-center text-slate-500 dark:text-slate-400">
                    Save your partner code to access your dashboard later.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>

        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <SubtleSkyBackground />
      <PublicNav variant="transparent" />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 
                className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-slate-100" 
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                data-testid="text-page-title"
              >
                Join Our Partner Program
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400">
                Earn commissions by referring visitors to our platform.
              </p>
            </motion.div>

            <motion.div 
              className="grid md:grid-cols-3 gap-6 mb-12"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <motion.div variants={fadeInUp}>
                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
                  <CardContent className="pt-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#6443F4]/10">
                      <Link2 className="h-6 w-6 text-[#6443F4]" />
                    </div>
                    <h3 
                      className="font-semibold mb-2 text-slate-900 dark:text-slate-100"
                      style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                    >
                      Get Your Link
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Sign up and receive a unique referral link instantly.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
                  <CardContent className="pt-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#6443F4]/10">
                      <Users className="h-6 w-6 text-[#6443F4]" />
                    </div>
                    <h3 
                      className="font-semibold mb-2 text-slate-900 dark:text-slate-100"
                      style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                    >
                      Share & Track
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Share your link and track all clicks in real-time.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
                  <CardContent className="pt-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#6443F4]/10">
                      <DollarSign className="h-6 w-6 text-[#6443F4]" />
                    </div>
                    <h3 
                      className="font-semibold mb-2 text-slate-900 dark:text-slate-100"
                      style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                    >
                      Earn Commission
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Earn 10% commission on every conversion you bring.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="max-w-md mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle 
                    className="text-slate-900 dark:text-slate-100"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    Register as a Partner
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Fill in your details to get started.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700 dark:text-slate-300">Full Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="John Doe" 
                                {...field} 
                                data-testid="input-name"
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700 dark:text-slate-300">Email Address</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="john@example.com" 
                                {...field} 
                                data-testid="input-email"
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white" 
                        disabled={registerMutation.isPending}
                        data-testid="button-submit"
                      >
                        {registerMutation.isPending ? "Registering..." : "Join Partner Program"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
