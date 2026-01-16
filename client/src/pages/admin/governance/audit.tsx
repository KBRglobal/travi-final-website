/**
 * Governance Audit Log Viewer
 * Feature flag: ENABLE_ENTERPRISE_GOVERNANCE_UI
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  History,
  ArrowLeft,
  Search,
  AlertCircle,
  RefreshCw,
  Eye,
  Filter,
  Download,
  User,
  Clock,
} from "lucide-react";

interface AuditEvent {
  id: string;
  eventType: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorName?: string;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  before?: string;
  after?: string;
  metadata?: Record<string, unknown>;
  diff?: {
    added: string[];
    removed: string[];
    changed: string[];
  };
}

export default function GovernanceAudit() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [eventTypeFilter, entityTypeFilter, page]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (eventTypeFilter && eventTypeFilter !== "all") {
        params.set("eventType", eventTypeFilter);
      }
      if (entityTypeFilter && entityTypeFilter !== "all") {
        params.set("entityType", entityTypeFilter);
      }
      if (searchTerm) {
        params.set("search", searchTerm);
      }

      const res = await fetch(`/api/admin/governance/audit?${params}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Access denied");
          return;
        }
        throw new Error("Failed to fetch audit events");
      }
      const data = await res.json();
      setEvents(page === 1 ? data.events : [...events, ...data.events]);
      setHasMore(data.hasMore ?? data.events.length === 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    setPage(1);
    fetchEvents();
  }

  async function exportAuditLog() {
    try {
      const params = new URLSearchParams();
      if (eventTypeFilter && eventTypeFilter !== "all") {
        params.set("eventType", eventTypeFilter);
      }
      if (entityTypeFilter && entityTypeFilter !== "all") {
        params.set("entityType", entityTypeFilter);
      }
      params.set("format", "csv");

      const res = await fetch(`/api/admin/governance/audit/export?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to export audit log");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    }
  }

  const eventTypeColors: Record<string, string> = {
    create: "bg-green-100 text-green-800",
    update: "bg-blue-100 text-blue-800",
    delete: "bg-red-100 text-red-800",
    login: "bg-[#6443F4]/10 text-[#6443F4]",
    logout: "bg-gray-100 text-gray-800",
    access: "bg-yellow-100 text-yellow-800",
    approve: "bg-green-100 text-green-800",
    reject: "bg-red-100 text-red-800",
  };

  const getEventColor = (eventType: string) => {
    const type = eventType.toLowerCase();
    for (const [key, value] of Object.entries(eventTypeColors)) {
      if (type.includes(key)) return value;
    }
    return "bg-gray-100 text-gray-800";
  };

  if (loading && events.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/governance">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Audit Log
          </h1>
          <p className="text-gray-500">Track all system activities and changes</p>
        </div>
        <Button variant="outline" onClick={exportAuditLog}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={eventTypeFilter} onValueChange={(v) => { setEventTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="access">Access</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityTypeFilter} onValueChange={(v) => { setEntityTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="contents">Content</SelectItem>
                  <SelectItem value="approval">Approval</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 w-48"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => { setPage(1); fetchEvents(); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Events ({events.length})
            {loading && <RefreshCw className="inline ml-2 h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Badge className={getEventColor(event.eventType)}>
                        {event.eventType}
                      </Badge>
                    </div>
                    <div>
                      <div className="font-medium">
                        {event.action} on {event.entityType}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Entity ID: {event.entityId}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {event.actorName || event.actorId.slice(0, 8)}
                          {event.actorRole && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              {event.actorRole}
                            </Badge>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                        {event.ipAddress && (
                          <span className="text-xs text-gray-400">
                            IP: {event.ipAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Audit Event Details</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Event Type</label>
                            <p>
                              <Badge className={getEventColor(event.eventType)}>
                                {event.eventType}
                              </Badge>
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Action</label>
                            <p className="text-gray-600">{event.action}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Entity Type</label>
                            <p className="text-gray-600">{event.entityType}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Entity ID</label>
                            <p className="text-gray-600 font-mono text-sm">{event.entityId}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Actor</label>
                            <p className="text-gray-600">
                              {event.actorName || event.actorId}
                              {event.actorRole && ` (${event.actorRole})`}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Timestamp</label>
                            <p className="text-gray-600">
                              {new Date(event.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {event.ipAddress && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">IP Address</label>
                              <p className="text-gray-600">{event.ipAddress}</p>
                            </div>
                            {event.userAgent && (
                              <div>
                                <label className="text-sm font-medium">User Agent</label>
                                <p className="text-gray-600 text-xs truncate">
                                  {event.userAgent}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        {event.diff && (
                          <div>
                            <label className="text-sm font-medium">Changes</label>
                            <div className="mt-1 space-y-1">
                              {event.diff.added.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-green-600">+ Added:</span>{" "}
                                  {event.diff.added.join(", ")}
                                </div>
                              )}
                              {event.diff.removed.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-red-600">- Removed:</span>{" "}
                                  {event.diff.removed.join(", ")}
                                </div>
                              )}
                              {event.diff.changed.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-blue-600">~ Changed:</span>{" "}
                                  {event.diff.changed.join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {(event.before || event.after) && (
                          <div className="grid grid-cols-2 gap-4">
                            {event.before && (
                              <div>
                                <label className="text-sm font-medium">Before</label>
                                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-48">
                                  {JSON.stringify(JSON.parse(event.before), null, 2)}
                                </pre>
                              </div>
                            )}
                            {event.after && (
                              <div>
                                <label className="text-sm font-medium">After</label>
                                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-48">
                                  {JSON.stringify(JSON.parse(event.after), null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div>
                            <label className="text-sm font-medium">Metadata</label>
                            <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No audit events found
              </div>
            )}
          </div>
          {hasMore && events.length > 0 && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
