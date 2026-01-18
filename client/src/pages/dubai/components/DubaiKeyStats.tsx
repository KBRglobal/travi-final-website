import { LucideIcon, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export interface DubaiKeyStat {
  value: string;
  label: string;
  subtext?: string;
  icon?: LucideIcon;
}

export interface DubaiKeyStatsProps {
  stats: DubaiKeyStat[];
  title?: string;
  subtitle?: string;
  columns?: 2 | 3 | 4 | 5;
  variant?: "default" | "compact" | "large";
}

export function DubaiKeyStats({
  stats,
  title,
  subtitle,
  columns = 5,
  variant = "default",
}: DubaiKeyStatsProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

        <motion.div
          className={`grid ${gridCols[columns]} gap-4`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon || TrendingUp;
            return (
              <motion.div key={index} variants={itemVariants}>
                <Card className={`text-center ${variant === "compact" ? "p-4" : "p-6"} h-full`}>
                  <CardContent className="p-0">
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className={`font-bold ${variant === "large" ? "text-3xl" : "text-2xl"} text-foreground`}>
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {stat.label}
                    </div>
                    {stat.subtext && (
                      <div className="text-xs text-primary font-medium mt-1">
                        {stat.subtext}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
