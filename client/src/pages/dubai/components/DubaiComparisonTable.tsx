import { CheckCircle2, XCircle, Minus, LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export interface ComparisonFeature {
  feature: string;
  optionA: string | boolean | null;
  optionB: string | boolean | null;
  highlight?: "A" | "B";
}

export interface DubaiComparisonTableProps {
  title?: string;
  subtitle?: string;
  optionATitle: string;
  optionABadge?: string;
  optionBTitle: string;
  optionBBadge?: string;
  features: ComparisonFeature[];
  recommendedOption?: "A" | "B";
}

export function DubaiComparisonTable({
  title,
  subtitle,
  optionATitle,
  optionABadge,
  optionBTitle,
  optionBBadge,
  features,
  recommendedOption,
}: DubaiComparisonTableProps) {
  const renderValue = (value: string | boolean | null, isHighlight?: boolean) => {
    if (value === true) {
      return <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />;
    }
    if (value === false) {
      return <XCircle className="w-5 h-5 text-red-400 mx-auto" />;
    }
    if (value === null) {
      return <Minus className="w-5 h-5 text-muted-foreground mx-auto" />;
    }
    return (
      <span className={isHighlight ? "font-semibold text-primary" : ""}>
        {value}
      </span>
    );
  };

  return (
    <section className="py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {(title || subtitle) && (
            <div className="text-center mb-12">
              {title && (
                <h2 className="text-3xl font-bold mb-3">{title}</h2>
              )}
              {subtitle && (
                <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
              )}
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium text-muted-foreground w-1/3">
                      Feature
                    </th>
                    <th className="text-center p-4 w-1/3">
                      <div className="flex flex-col items-center gap-2">
                        <span className="font-bold text-lg">{optionATitle}</span>
                        {optionABadge && (
                          <Badge variant={recommendedOption === "A" ? "default" : "outline"} className="text-xs">
                            {optionABadge}
                          </Badge>
                        )}
                        {recommendedOption === "A" && !optionABadge && (
                          <Badge className="text-xs">Recommended</Badge>
                        )}
                      </div>
                    </th>
                    <th className="text-center p-4 w-1/3">
                      <div className="flex flex-col items-center gap-2">
                        <span className="font-bold text-lg">{optionBTitle}</span>
                        {optionBBadge && (
                          <Badge variant={recommendedOption === "B" ? "default" : "outline"} className="text-xs">
                            {optionBBadge}
                          </Badge>
                        )}
                        {recommendedOption === "B" && !optionBBadge && (
                          <Badge className="text-xs">Recommended</Badge>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((row, index) => (
                    <tr 
                      key={index} 
                      className={`border-b last:border-b-0 ${index % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                    >
                      <td className="p-4 font-medium">{row.feature}</td>
                      <td className={`p-4 text-center ${row.highlight === "A" ? "bg-primary/5" : ""}`}>
                        {renderValue(row.optionA, row.highlight === "A")}
                      </td>
                      <td className={`p-4 text-center ${row.highlight === "B" ? "bg-primary/5" : ""}`}>
                        {renderValue(row.optionB, row.highlight === "B")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
