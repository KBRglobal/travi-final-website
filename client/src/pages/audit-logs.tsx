import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Redirect } from "wouter";
import {
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Send,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

interface AuditLog {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  actionType: string;
  entityType: string;
  entityId: string | null;
  entityTitle: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

interface PermissionsResponse {
  role?: string;
  permissions?: {
    canViewAuditLogs?: boolean;
    [key: string]: boolean | undefined;
  };
  // Support flat permissions for backward compatibility
  canViewAuditLogs?: boolean;
  [key: string]: boolean | string | { [key: string]: boolean | undefined } | undefined;
}

// Helper to extract canViewAuditLogs from response
function getCanViewAuditLogs(response: PermissionsResponse | undefined): boolean {
  if (!response) return false;
  // Handle nested permissions object from API
  if (response.permissions?.canViewAuditLogs !== undefined) {
    return response.permissions.canViewAuditLogs === true;
  }
  // Handle flat permissions for backward compatibility
  return response.canViewAuditLogs === true;
}

const ACTION_ICONS: Record<string, typeof Plus> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  view: Eye,
  submit_for_review: Send,
  approve: CheckCircle,
  publish: CheckCircle,
  login: User,
  logout: User,
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  view: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  submit_for_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approve: "bg-[#6443F4]/10 text-[#6443F4] dark:bg-[#6443F4]/20 dark:text-[#6443F4]",
  publish: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  login: "bg-[#6443F4]/10 text-[#6443F4] dark:bg-[#6443F4]/20 dark:text-[#6443F4]",
  logout: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const { data: permissionsResponse, isLoading: permissionsLoading } = useQuery<PermissionsResponse>({
    queryKey: ["/api/user/permissions"],
  });

  const canViewAuditLogs = getCanViewAuditLogs(permissionsResponse);

  const { data, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ["/api/audit-logs", { 
      actionType: actionFilter !== "all" ? actionFilter : undefined,
      entityType: entityFilter !== "all" ? entityFilter : undefined,
      limit: pageSize, 
      offset: page * pageSize 
    }],
    enabled: canViewAuditLogs,
  });

  if (!permissionsLoading && permissionsResponse && !canViewAuditLogs) {
    return <Redirect to="/access-denied" />;
  }

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const filteredLogs = search
    ? logs.filter(
        (log) =>
          log.userName?.toLowerCase().includes(search.toLowerCase()) ||
          log.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
          log.entityTitle?.toLowerCase().includes(search.toLowerCase()) ||
          log.actionType.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-audit-logs">
            <ClipboardList className="h-6 w-6" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">
            View all system activity and user actions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, action, or contents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-logs"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-action-filter">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="submit_for_review">Submit for Review</SelectItem>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="publish">Publish</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-entity-filter">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="contents">Content</SelectItem>
                <SelectItem value="attraction">Attraction</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading || permissionsLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No audit logs found</p>
              <p className="text-sm mt-2 max-w-md mx-auto">
                Audit logs record user actions like creating, editing, and publishing contents.
                As team members work in the system, their actions will be logged here for accountability and review.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredLogs.map((log) => {
                const ActionIcon = ACTION_ICONS[log.actionType] || RefreshCw;
                const actionColor = ACTION_COLORS[log.actionType] || ACTION_COLORS.view;

                return (
                  <div
                    key={log.id}
                    className="p-4 flex items-start gap-4 hover-elevate"
                    data-testid={`log-entry-${log.id}`}
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" data-testid={`log-user-${log.id}`}>
                          {log.userName || log.userEmail || "Unknown User"}
                        </span>
                        <Badge variant="secondary" className={actionColor}>
                          <ActionIcon className="h-3 w-3 mr-1" />
                          {log.actionType.replace(/_/g, " ")}
                        </Badge>
                        {log.entityType && (
                          <Badge variant="outline">
                            <FileText className="h-3 w-3 mr-1" />
                            {log.entityType}
                          </Badge>
                        )}
                      </div>
                      {log.entityTitle && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {log.entityTitle}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimestamp(log.timestamp)}
                        {log.ipAddress && ` • ${log.ipAddress}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, total)} of {total} logs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
