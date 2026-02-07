import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export interface Column<T> {
  key: string;
  header: string;
  cell: (item: T) => React.ReactNode;
  sortable?: boolean;
}

export interface Action<T> {
  label: string;
  onClick: (item: T) => void;
  variant?: "default" | "destructive";
  icon?: React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  getItemId: (item: T) => string;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  showSelectAllBanner?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  actions,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getItemId,
  pageSize = 10,
  emptyMessage = "No items found",
  onRowClick,
  showSelectAllBanner = true,
}: Readonly<DataTableProps<T>>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  const allPageSelected =
    paginatedData.length > 0 && paginatedData.every(item => selectedIds.includes(getItemId(item)));

  const allDataSelected =
    data.length > 0 && data.every(item => selectedIds.includes(getItemId(item)));

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      const newIds = Array.from(new Set([...selectedIds, ...paginatedData.map(getItemId)]));
      onSelectionChange(newIds);
    } else {
      const pageIds = paginatedData.map(getItemId);
      onSelectionChange(selectedIds.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectAllData = () => {
    if (!onSelectionChange) return;
    onSelectionChange(data.map(getItemId));
  };

  const handleClearSelection = () => {
    if (!onSelectionChange) return;
    onSelectionChange([]);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(existingId => existingId !== id));
    }
  };

  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-4">
      {selectable &&
        showSelectAllBanner &&
        allPageSelected &&
        !allDataSelected &&
        data.length > pageSize && (
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-sm"
            data-testid="select-all-banner"
          >
            <span className="text-blue-700 dark:text-blue-300 text-center">
              {paginatedData.length} of {data.length} items selected (this page only).
            </span>
            <button
              type="button"
              onClick={handleSelectAllData}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              data-testid="button-select-all-items"
            >
              Select all {data.length} items across all pages
            </button>
          </div>
        )}
      {selectable && showSelectAllBanner && allDataSelected && data.length > pageSize && (
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm"
          data-testid="all-selected-banner"
        >
          <span className="text-amber-700 dark:text-amber-300 font-medium text-center">
            All {data.length} items are selected across all pages.
          </span>
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
            data-testid="button-clear-all-items"
          >
            Clear selection
          </button>
        </div>
      )}
      <div
        className="rounded-md border overflow-x-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
              )}
              {columns.map(column => (
                <TableHead key={column.key}>{column.header}</TableHead>
              ))}
              {actions && actions.length > 0 && <TableHead className="w-12">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map(item => {
              const id = getItemId(item);
              return (
                <TableRow
                  key={id}
                  data-testid={`row-${id}`}
                  className={onRowClick ? "cursor-pointer hover-elevate" : ""}
                  onClick={e => {
                    // Don't trigger row click when clicking on checkbox or actions
                    const target = e.target as HTMLElement;
                    if (
                      target.closest("button") ||
                      target.closest('[role="checkbox"]') ||
                      target.closest("[data-radix-collection-item]")
                    ) {
                      return;
                    }
                    onRowClick?.(item);
                  }}
                >
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(id)}
                        onCheckedChange={checked => handleSelectOne(id, !!checked)}
                        data-testid={`checkbox-row-${id}`}
                      />
                    </TableCell>
                  )}
                  {columns.map(column => (
                    <TableCell key={column.key}>{column.cell(item)}</TableCell>
                  ))}
                  {actions && actions.length > 0 && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions.map(action => (
                            <DropdownMenuItem
                              key={action.label}
                              onClick={() => action.onClick(item)}
                              className={action.variant === "destructive" ? "text-destructive" : ""}
                              data-testid={`action-${action.label.toLowerCase().replace(" ", "-")}-${id}`}
                            >
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground text-center sm:text-start">
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, data.length)} of{" "}
            {data.length} items
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
