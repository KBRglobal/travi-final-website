import { useState } from "react";
import { Filter, X, ChevronDown, ChevronUp, Check, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
}

interface CategoryFilterSidebarProps {
  areas: FilterGroup;
  types: FilterGroup;
  sortOptions: FilterOption[];
  selectedFilters: Record<string, string[]>;
  selectedSort: string;
  onFilterChange: (groupId: string, optionId: string, checked: boolean) => void;
  onSortChange: (sortId: string) => void;
  onClearFilters: () => void;
  totalResults: number;
}

function FilterContent({
  areas,
  types,
  selectedFilters,
  onFilterChange,
}: Pick<CategoryFilterSidebarProps, "areas" | "types" | "selectedFilters" | "onFilterChange">) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    areas: true,
    types: true,
  });

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const renderFilterGroup = (group: FilterGroup) => {
    const isOpen = openSections[group.id] ?? true;
    const selectedCount = selectedFilters[group.id]?.length || 0;

    return (
      <Collapsible
        key={group.id}
        open={isOpen}
        onOpenChange={() => toggleSection(group.id)}
        className="space-y-3"
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{group.label}</span>
            {selectedCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-[#6443F4]/10 text-[#6443F4] border-0 text-xs px-1.5"
              >
                {selectedCount}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          {group.options.map((option) => {
            const isSelected = selectedFilters[group.id]?.includes(option.id);
            return (
              <label
                key={option.id}
                className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                data-testid={`filter-${group.id}-${option.id}`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    onFilterChange(group.id, option.id, !!checked)
                  }
                  className="border-muted-foreground/50 data-[state=checked]:bg-[#6443F4] data-[state=checked]:border-[#6443F4]"
                />
                <span className="flex-1 text-sm">{option.label}</span>
                {option.count !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {option.count}
                  </span>
                )}
              </label>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-6">
      {renderFilterGroup(areas)}
      <div className="h-px bg-border" />
      {renderFilterGroup(types)}
    </div>
  );
}

export function CategoryFilterSidebar({
  areas,
  types,
  sortOptions,
  selectedFilters,
  selectedSort,
  onFilterChange,
  onSortChange,
  onClearFilters,
  totalResults,
}: CategoryFilterSidebarProps) {
  const totalSelectedFilters = Object.values(selectedFilters).flat().length;

  return (
    <>
      <aside
        className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-24 self-start"
        data-testid="filter-sidebar"
      >
        <div className="bg-card rounded-xl border border-border/50 p-5 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#6443F4]" />
              <span className="font-semibold">Filters</span>
            </div>
            {totalSelectedFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                data-testid="clear-filters"
              >
                Clear all
              </Button>
            )}
          </div>

          <FilterContent
            areas={areas}
            types={types}
            selectedFilters={selectedFilters}
            onFilterChange={onFilterChange}
          />

          <div className="h-px bg-border" />

          <div className="space-y-3">
            <span className="font-semibold text-sm">Sort by</span>
            <Select value={selectedSort} onValueChange={onSortChange}>
              <SelectTrigger
                className="w-full"
                data-testid="sort-select"
              >
                <SelectValue placeholder="Select sort" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{totalResults}</span>{" "}
              {totalResults === 1 ? "result" : "results"} found
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:hidden sticky top-16 md:top-20 z-40 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                data-testid="mobile-filter-trigger"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {totalSelectedFilters > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-[#6443F4] text-white border-0 text-xs px-1.5 ml-1"
                  >
                    {totalSelectedFilters}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px]">
              <SheetHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <SheetTitle className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#6443F4]" />
                    Filters
                  </SheetTitle>
                  {totalSelectedFilters > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClearFilters}
                      className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              </SheetHeader>

              <div className="py-4 space-y-6">
                <FilterContent
                  areas={areas}
                  types={types}
                  selectedFilters={selectedFilters}
                  onFilterChange={onFilterChange}
                />

                <div className="h-px bg-border" />

                <div className="space-y-3">
                  <span className="font-semibold text-sm">Sort by</span>
                  <Select value={selectedSort} onValueChange={onSortChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select sort" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <SheetClose asChild>
                  <Button className="w-full bg-[#6443F4] hover:bg-[#5339D9] text-white">
                    Show {totalResults} {totalResults === 1 ? "result" : "results"}
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>

          <Select value={selectedSort} onValueChange={onSortChange}>
            <SelectTrigger
              className="w-[140px]"
              data-testid="mobile-sort-select"
            >
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{totalResults}</span> results
          </div>
        </div>
      </div>
    </>
  );
}
