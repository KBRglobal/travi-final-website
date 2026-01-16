import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <section 
      className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12"
      data-testid="section-pagination"
    >
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-lg"
          data-testid="pagination-prev"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 min-w-[80px] justify-center">
          <span className="text-sm font-medium tabular-nums">
            {currentPage}
          </span>
          <span className="text-sm text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {totalPages}
          </span>
        </div>

        <Button
          variant="outline"
          size="icon"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-lg"
          data-testid="pagination-next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
