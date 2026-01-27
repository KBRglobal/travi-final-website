import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({ title, description, actions, className }: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        "h-14 min-h-14 px-5 flex items-center justify-between gap-4",
        "border-b border-[hsl(var(--admin-border-subtle))]",
        "bg-[hsl(var(--admin-surface))] sticky top-0 z-10",
        className
      )}
    >
      <div className="flex flex-col gap-0">
        <h1 className="text-[16px] font-semibold text-[hsl(var(--admin-text))]">{title}</h1>
        {description && (
          <p className="text-[13px] text-[hsl(var(--admin-text-muted))]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

interface AdminPageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminPageLayout({ children, className }: AdminPageLayoutProps) {
  return (
    <div
      className={cn("flex flex-col h-full overflow-hidden bg-[hsl(var(--admin-bg))]", className)}
    >
      {children}
    </div>
  );
}

interface AdminPageContentProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function AdminPageContent({ children, className, noPadding }: AdminPageContentProps) {
  return (
    <div className={cn("flex-1 overflow-auto", !noPadding && "p-5", className)}>{children}</div>
  );
}

interface ListPageLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
  pagination?: React.ReactNode;
}

export function ListPageLayout({
  title,
  description,
  actions,
  filters,
  children,
  pagination,
}: ListPageLayoutProps) {
  return (
    <AdminPageLayout>
      <AdminPageHeader title={title} description={description} actions={actions} />
      {filters && (
        <div className="px-5 py-3 border-b border-[hsl(var(--admin-border-subtle))] bg-[hsl(var(--admin-surface))] flex items-center gap-3 flex-wrap">
          {filters}
        </div>
      )}
      <AdminPageContent noPadding>
        <div className="min-h-0 flex-1">{children}</div>
      </AdminPageContent>
      {pagination && (
        <div className="px-5 py-3 border-t border-[hsl(var(--admin-border-subtle))] bg-[hsl(var(--admin-surface))] flex items-center justify-between gap-4">
          {pagination}
        </div>
      )}
    </AdminPageLayout>
  );
}

interface EditorPageLayoutProps {
  title: string;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  sidebar: React.ReactNode;
  backUrl?: string;
}

export function EditorPageLayout({
  title,
  status,
  actions,
  children,
  sidebar,
  backUrl,
}: EditorPageLayoutProps) {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={title}
        actions={
          <div className="flex items-center gap-3">
            {status}
            {actions}
          </div>
        }
      />
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-auto p-5 basis-[70%]">{children}</div>
        <div className="w-72 border-l border-[hsl(var(--admin-border-subtle))] overflow-auto p-5 bg-[hsl(var(--admin-surface))] basis-[30%] max-w-72">
          {sidebar}
        </div>
      </div>
    </AdminPageLayout>
  );
}

interface DashboardLayoutProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function DashboardLayout({
  title,
  description,
  actions,
  stats,
  children,
  footer,
}: DashboardLayoutProps) {
  return (
    <AdminPageLayout>
      <AdminPageHeader title={title} description={description} actions={actions} />
      <AdminPageContent>
        {stats && <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">{stats}</div>}
        <div className="space-y-5">{children}</div>
      </AdminPageContent>
      {footer && (
        <div className="px-5 py-3 border-t border-[hsl(var(--admin-border-subtle))] bg-[hsl(var(--admin-surface))]">
          {footer}
        </div>
      )}
    </AdminPageLayout>
  );
}

interface SettingsLayoutProps {
  title: string;
  description?: string;
  navigation: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function SettingsLayout({
  title,
  description,
  navigation,
  children,
  actions,
}: SettingsLayoutProps) {
  return (
    <AdminPageLayout>
      <AdminPageHeader title={title} description={description} actions={actions} />
      <div className="flex-1 overflow-hidden flex">
        <div className="w-52 border-r border-[hsl(var(--admin-border-subtle))] overflow-auto py-3 px-2 bg-[hsl(var(--admin-surface))]">
          {navigation}
        </div>
        <div className="flex-1 overflow-auto p-5">{children}</div>
      </div>
    </AdminPageLayout>
  );
}

interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  title,
  value,
  icon,
  trend,
  description,
  loading,
  className,
}: StatCardProps) {
  const displayLabel = title || label || "";

  if (loading) {
    return (
      <div
        className={cn(
          "bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border-subtle))] rounded-[var(--admin-radius-md)] p-4 animate-pulse",
          className
        )}
      >
        <div className="h-3 bg-[hsl(var(--admin-surface-active))] rounded w-1/3 mb-3" />
        <div className="h-7 bg-[hsl(var(--admin-surface-active))] rounded w-1/2" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border-subtle))] rounded-[var(--admin-radius-md)] p-4 flex flex-col gap-1.5",
        "hover:border-[hsl(var(--admin-border-hover))] transition-colors duration-150",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[hsl(var(--admin-text-muted))]">{displayLabel}</span>
        {icon && <span className="text-[hsl(var(--admin-text-muted))]">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-[hsl(var(--admin-text))]">{value}</span>
        {trend && (
          <span
            className={cn(
              "text-[11px] font-medium",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
      {description && (
        <span className="text-[11px] text-[hsl(var(--admin-text-muted))]">{description}</span>
      )}
    </div>
  );
}

interface AdminEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function AdminEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}
    >
      {icon && <div className="mb-4 text-[hsl(var(--admin-text-muted))]">{icon}</div>}
      <h3 className="text-[16px] font-medium text-[hsl(var(--admin-text))] mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] text-[hsl(var(--admin-text-muted))] mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

interface AdminSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function AdminTableSkeleton({ rows = 5, className }: AdminSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="h-10 bg-[hsl(var(--admin-surface-active))] rounded-[var(--admin-radius-sm)] animate-pulse" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 bg-[hsl(var(--admin-surface-active))] rounded-[var(--admin-radius-sm)] animate-pulse"
        />
      ))}
    </div>
  );
}

export function AdminCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border-subtle))] rounded-[var(--admin-radius-md)] p-4 animate-pulse",
        className
      )}
    >
      <div className="h-3 bg-[hsl(var(--admin-surface-active))] rounded w-1/3 mb-3" />
      <div className="h-6 bg-[hsl(var(--admin-surface-active))] rounded w-1/2" />
    </div>
  );
}

interface AdminSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminSection({
  title,
  description,
  children,
  actions,
  className,
}: AdminSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-[15px] font-semibold text-[hsl(var(--admin-text))]">{title}</h2>
            )}
            {description && (
              <p className="text-[13px] text-[hsl(var(--admin-text-muted))]">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
