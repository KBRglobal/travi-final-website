import { useState } from "react";
import { motion } from "framer-motion";
import { SEOHead } from "@/components/seo-head";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Mail, 
  Clock, 
  Send, 
  Loader2, 
  MessageSquare, 
  Building2,
  CheckCircle2,
  Globe,
  Headphones
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function PublicContact() {
  const { t } = useLocale();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    inquiryType: "",
    subject: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Required fields missing",
        description: "Please complete all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, inquiryType: value }));
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", inquiryType: "", subject: "", message: "" });
    setIsSubmitted(false);
  };

  const contactDetails = [
    {
      icon: Mail,
      title: "Email",
      value: "info@travi.world",
      description: "General inquiries and support",
      href: "mailto:info@travi.world"
    },
    {
      icon: Clock,
      title: "Response Time",
      value: "Within 24 hours",
      description: "Monday to Friday",
      href: null
    },
    {
      icon: Globe,
      title: "Global Coverage",
      value: "15+ Destinations",
      description: "Expanding worldwide",
      href: null
    }
  ];

  const inquiryTypes = [
    { value: "general", label: "General Inquiry" },
    { value: "partnership", label: "Partnership Opportunity" },
    { value: "advertising", label: "Advertising" },
    { value: "contents", label: "Content Collaboration" },
    { value: "feedback", label: "Feedback" },
    { value: "technical", label: "Technical Support" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <SubtleSkyBackground />
      <PublicNav variant="transparent" />

      <SEOHead
        title="Contact Us | Travi - Global Travel Platform"
        description="Get in touch with the Travi team. We're here to help with your travel questions, partnership inquiries, and feedback."
        keywords={["contact travi", "travel platform contact", "travel support", "partnership inquiry"]}
      />

      <section className="relative pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-6"
          >
            <motion.div 
              variants={fadeInUp}
              className="w-16 h-16 mx-auto rounded-full bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center"
            >
              <MessageSquare className="w-8 h-8 text-[#6443F4]" />
            </motion.div>
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              {t('contact.title') || "Contact Us"}
            </motion.h1>
            <motion.p 
              variants={fadeInUp}
              className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto"
            >
              {t('contact.subtitle') || "Have a question, suggestion, or just want to say hello? We'd love to hear from you!"}
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">
            
            <motion.div 
              className="lg:col-span-3"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900">
                <CardContent className="p-8">
                  {isSubmitted ? (
                    <motion.div 
                      className="text-center py-12"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                      </div>
                      <h2 
                        className="text-2xl font-bold text-slate-900 dark:text-white mb-3"
                        style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                      >
                        Message Received
                      </h2>
                      <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-md mx-auto">
                        Thank you for reaching out. Our team will review your message and respond within 24 hours.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={resetForm}
                        className="rounded-full"
                        data-testid="button-contact-send-another"
                      >
                        Send Another Message
                      </Button>
                    </motion.div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-full bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center">
                          <Send className="w-5 h-5 text-[#6443F4]" />
                        </div>
                        <div>
                          <h2 
                            className="text-xl font-semibold text-slate-900 dark:text-white"
                            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                          >
                            Send us a message
                          </h2>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Fill out the form below and we'll get back to you
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Full Name <span className="text-[#6443F4]">*</span>
                            </Label>
                            <Input
                              id="name"
                              name="name"
                              placeholder="John Smith"
                              value={formData.name}
                              onChange={handleChange}
                              disabled={isSubmitting}
                              className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                              data-testid="input-contact-name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Email Address <span className="text-[#6443F4]">*</span>
                            </Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              placeholder="john@company.com"
                              value={formData.email}
                              onChange={handleChange}
                              disabled={isSubmitting}
                              className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                              data-testid="input-contact-email"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="inquiryType" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Inquiry Type
                            </Label>
                            <Select 
                              value={formData.inquiryType} 
                              onValueChange={handleSelectChange}
                              disabled={isSubmitting}
                            >
                              <SelectTrigger className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" data-testid="select-contact-type">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent>
                                {inquiryTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="subject" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Subject
                            </Label>
                            <Input
                              id="subject"
                              name="subject"
                              placeholder="Brief summary of your inquiry"
                              value={formData.subject}
                              onChange={handleChange}
                              disabled={isSubmitting}
                              className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                              data-testid="input-contact-subject"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Message <span className="text-[#6443F4]">*</span>
                          </Label>
                          <Textarea
                            id="message"
                            name="message"
                            placeholder="Please provide as much detail as possible..."
                            rows={6}
                            value={formData.message}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            className="resize-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            data-testid="input-contact-message"
                          />
                        </div>

                        <div className="pt-2">
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            size="lg"
                            className="w-full sm:w-auto rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white px-10"
                            data-testid="button-contact-submit"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-5 h-5 mr-2" />
                                Send Message
                              </>
                            )}
                          </Button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                          By submitting this form, you agree to our privacy policy. We will never share your information with third parties.
                        </p>
                      </form>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div 
              className="lg:col-span-2 space-y-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              
              <div className="space-y-4">
                {contactDetails.map((detail, index) => {
                  const IconComponent = detail.icon;
                  const contents = (
                    <motion.div variants={fadeInUp}>
                      <Card 
                        className={`border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 bg-white dark:bg-slate-900 ${detail.href ? 'hover:shadow-md cursor-pointer' : ''}`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center flex-shrink-0">
                              <IconComponent className="w-6 h-6 text-[#6443F4]" />
                            </div>
                            <div>
                              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                                {detail.title}
                              </div>
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {detail.value}
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {detail.description}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );

                  return detail.href ? (
                    <a 
                      key={index} 
                      href={detail.href}
                      className="block"
                      data-testid={`contact-${detail.title.toLowerCase()}`}
                    >
                      {contents}
                    </a>
                  ) : (
                    <div key={index}>{contents}</div>
                  );
                })}
              </div>

              <motion.div variants={fadeInUp}>
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-[#6443F4]" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                          Registered Office
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-white mb-2">
                          Gibraltar
                        </div>
                        <address className="text-sm text-slate-500 dark:text-slate-400 not-italic leading-relaxed">
                          Suite 4.3.02, Block 4<br />
                          Eurotowers<br />
                          Gibraltar<br />
                          GX11 1AA<br />
                          Gibraltar
                        </address>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-900">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center flex-shrink-0">
                        <Headphones className="w-6 h-6 text-[#6443F4]" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white mb-1">
                          Business Partnerships
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                          Interested in advertising, contents partnerships, or collaboration?
                        </p>
                        <a 
                          href="mailto:info@travi.world"
                          className="inline-flex items-center text-sm font-medium text-[#6443F4] hover:text-[#5539d4] transition-colors"
                          data-testid="contact-business-email"
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          info@travi.world
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
