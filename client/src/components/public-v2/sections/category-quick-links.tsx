import { Link } from "wouter";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface CategoryQuickLinksProps {
  categories: ReactNode | null;
  contextPath: string;
}

export function CategoryQuickLinks({ categories, contextPath }: CategoryQuickLinksProps) {
  if (!categories) {
    return null;
  }

  return (
    <section 
      className="container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8"
      data-testid="section-category-quick-links"
    >
      <div className="flex flex-wrap gap-2 md:gap-3">
        {categories}
      </div>
    </section>
  );
}
