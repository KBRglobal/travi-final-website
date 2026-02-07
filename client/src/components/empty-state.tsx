import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { isValidElement } from "react";

interface EmptyStateProps {
  icon: LucideIcon | ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
}: Readonly<EmptyStateProps>) {
  // Support both LucideIcon components and ReactNode elements
  const renderIcon = () => {
    if (isValidElement(icon)) {
      return icon;
    }
    const Icon = icon as LucideIcon;
    return <Icon className="h-8 w-8 text-muted-foreground" />;
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        {renderIcon()}
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action
        ? action
        : actionLabel &&
          onAction && (
            <Button onClick={onAction} data-testid="button-empty-action">
              {actionLabel}
            </Button>
          )}
    </div>
  );
}
