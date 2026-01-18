import { ReactNode } from "react";
import { LucideIcon, Calculator, Info } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export interface CalculatorResult {
  label: string;
  value: string;
  highlight?: boolean;
  subtext?: string;
}

export interface DubaiCalculatorShellProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badges?: string[];
  inputSection: ReactNode;
  results?: CalculatorResult[];
  disclaimer?: string;
  onCalculate?: () => void;
  calculateLabel?: string;
  isCalculating?: boolean;
  additionalContent?: ReactNode;
}

export function DubaiCalculatorShell({
  title,
  subtitle,
  icon: Icon = Calculator,
  badges,
  inputSection,
  results,
  disclaimer,
  onCalculate,
  calculateLabel = "Calculate",
  isCalculating = false,
  additionalContent,
}: DubaiCalculatorShellProps) {
  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="bg-primary/5 border-b pb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{title}</h2>
                    {subtitle && (
                      <p className="text-muted-foreground mt-1">{subtitle}</p>
                    )}
                  </div>
                </div>
                {badges && badges.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {badges.map((badge, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="font-semibold text-lg border-b pb-2">Input Parameters</h3>
                  {inputSection}
                  
                  {onCalculate && (
                    <Button 
                      className="w-full mt-4" 
                      size="lg"
                      onClick={onCalculate}
                      disabled={isCalculating}
                      data-testid="button-calculator-calculate"
                    >
                      {isCalculating ? "Calculating..." : calculateLabel}
                    </Button>
                  )}
                </div>

                <div className="space-y-6">
                  <h3 className="font-semibold text-lg border-b pb-2">Results</h3>
                  
                  {results && results.length > 0 ? (
                    <div className="space-y-4">
                      {results.map((result, index) => (
                        <div 
                          key={index}
                          className={`p-4 rounded-lg ${result.highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}
                        >
                          <div className="text-sm text-muted-foreground mb-1">
                            {result.label}
                          </div>
                          <div className={`text-2xl font-bold ${result.highlight ? "text-primary" : ""}`}>
                            {result.value}
                          </div>
                          {result.subtext && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {result.subtext}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-lg">
                      <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Enter values and click calculate to see results</p>
                    </div>
                  )}
                </div>
              </div>

              {additionalContent && (
                <div className="mt-8 pt-6 border-t">
                  {additionalContent}
                </div>
              )}

              {disclaimer && (
                <div className="mt-6 p-4 bg-muted/30 rounded-lg flex gap-3">
                  <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    {disclaimer}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
