import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({ title, description, actions, className }: AdminPageHeaderProps) {
  return (
    <div className={cn(
      "h-16 min-h-16 px-6 flex items-center justify-between gap-4 border-b bg-background sticky top-0 z-10",
      className
    )}>
      <div className="flex flex-col gap-0.5">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

interface AdminPageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminPageLayout({ children, className }: AdminPageLayoutProps) {
  return (
    <div className={cn("flex flex-col h-full overflow-hidden bg-background", className)}>
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
    <div className={cn(
      "flex-1 overflow-auto",
      !noPadding && "p-6",
      className
    )}>
      {children}
    </div>
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
  pagination 
}: ListPageLayoutProps) {
  return (
    <AdminPageLayout>
      <AdminPageHeader title={title} description={description} actions={actions} />
      {filters && (
        <div className="px-6 py-3 border-b bg-muted flex items-center gap-3 flex-wrap">
          {filters}
        </div>
      )}
      <AdminPageContent noPadding>
        <div className="min-h-0 flex-1">
          {children}
        </div>
      </AdminPageContent>
      {pagination && (
        <div className="px-6 py-3 border-t bg-background flex items-center justify-between gap-4">
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
  backUrl 
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
        <div className="flex-1 overflow-auto p-6 basis-[70%]">
          {children}
        </div>
        <div className="w-80 border-l overflow-auto p-6 bg-muted basis-[30%] max-w-80">
          {sidebar}
        </div>
      </div>
    </AdminPageLayout>
  );
}

interface DashboardLayoutProps {
  title: string;
  description?: string;
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
  footer
}: DashboardLayoutProps) {
  return (
    <AdminPageLayout>
      <AdminPageHeader title={title} description={description} actions={actions} />
      <AdminPageContent>
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {stats}
          </div>
        )}
        <div className="space-y-6">
          {children}
        </div>
      </AdminPageContent>
      {footer && (
        <div className="px-6 py-3 border-t bg-muted">
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
  actions
}: SettingsLayoutProps) {
  return (
    <AdminPageLayout>
      <AdminPageHeader title={title} description={description} actions={actions} />
      <div className="flex-1 overflow-hidden flex">
        <div className="w-56 border-r overflow-auto py-4 px-2 bg-muted">
          {navigation}
        </div>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </AdminPageLayout>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn(
      "bg-card border rounded-md p-4 flex flex-col gap-2",
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{value}</span>
        {trend && (
          <span className={cn(
            "text-xs font-medium",
            trend.isPositive ? "text-green-600" : "text-red-600"
          )}>
            {trend.isPositive ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>
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

export function AdminEmptyState({ icon, title, description, action, className }: AdminEmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center",
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

interface AdminSkeletonProps {
  rows?: number;
  className?: string;
}

export function AdminTableSkeleton({ rows = 5, className }: AdminSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="h-10 bg-muted rounded animate-pulse" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-muted rounded animate-pulse" />
      ))}
    </div>
  );
}

export function AdminCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card border rounded-md p-4 animate-pulse", className)}>
      <div className="h-4 bg-muted rounded w-1/3 mb-3" />
      <div className="h-8 bg-muted rounded w-1/2" />
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

export function AdminSection({ title, description, children, actions, className }: AdminSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
