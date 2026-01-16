/**
 * Governance Approvals Management
 * Feature flag: ENABLE_ENTERPRISE_GOVERNANCE_UI
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock,
  ArrowLeft,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
} from "lucide-react";

type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled" | "escalated" | "expired";

interface ApprovalRequest {
  id: string;
  requestType: string;
  entityType: string;
  entityId: string;
  status: ApprovalStatus;
  requesterId: string;
  requesterName?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export default function GovernanceApprovals() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [processing, setProcessing] = useState(false);
  const [comment, setComment] = useState("");

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const res = await fetch(`/api/admin/governance/approvals?${params}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Access denied");
          return;
        }
        throw new Error("Failed to fetch approval requests");
      }
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(requestId: string, action: "approve" | "reject") {
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/governance/approvals/${requestId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comment }),
      });

      if (!res.ok) throw new Error(`Failed to ${action} request`);

      await fetchRequests();
      setSelectedRequest(null);
      setComment("");
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setProcessing(false);
    }
  }

  const filteredRequests = requests.filter(
    (req) =>
      req.requestType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requesterName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors: Record<ApprovalStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
    escalated: "bg-orange-100 text-orange-800",
    expired: "bg-gray-100 text-gray-500",
  };

  const canTakeAction = (status: ApprovalStatus) =>
    status === "pending" || status === "escalated";

  if (loading && requests.length === 0) {
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
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Approval Requests
          </h1>
          <p className="text-gray-500">Review and process approval workflows</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Requests ({filteredRequests.length})
              {loading && <RefreshCw className="inline ml-2 h-4 w-4 animate-spin" />}
            </CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => fetchRequests()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <div className="font-medium">{req.requestType}</div>
                    <div className="text-sm text-gray-500">
                      {req.entityType}: {req.entityId.slice(0, 8)}...
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{req.entityType}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>{req.requesterName || "Unknown"}</div>
                    <div className="text-xs text-gray-400">{req.requesterId.slice(0, 8)}...</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[req.status]}>
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(req.createdAt).toLocaleTimeString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRequest(req)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Approval Request Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Request Type</label>
                                <p className="text-gray-600">{req.requestType}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Status</label>
                                <p>
                                  <Badge className={statusColors[req.status]}>
                                    {req.status}
                                  </Badge>
                                </p>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Entity</label>
                              <p className="text-gray-600">
                                {req.entityType}: {req.entityId}
                              </p>
                            </div>
                            {req.reason && (
                              <div>
                                <label className="text-sm font-medium">Reason</label>
                                <p className="text-gray-600">{req.reason}</p>
                              </div>
                            )}
                            <div>
                              <label className="text-sm font-medium">Requester</label>
                              <p className="text-gray-600">
                                {req.requesterName || req.requesterId}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Created</label>
                                <p className="text-gray-600">
                                  {new Date(req.createdAt).toLocaleString()}
                                </p>
                              </div>
                              {req.expiresAt && (
                                <div>
                                  <label className="text-sm font-medium">Expires</label>
                                  <p className="text-gray-600">
                                    {new Date(req.expiresAt).toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                            {canTakeAction(req.status) && (
                              <div>
                                <label className="text-sm font-medium">Comment (optional)</label>
                                <Textarea
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  placeholder="Add a comment for this decision..."
                                  className="mt-1"
                                />
                              </div>
                            )}
                          </div>
                          {canTakeAction(req.status) && (
                            <DialogFooter className="mt-4">
                              <Button
                                variant="outline"
                                onClick={() => handleAction(req.id, "reject")}
                                disabled={processing}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                              <Button
                                onClick={() => handleAction(req.id, "approve")}
                                disabled={processing}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            </DialogFooter>
                          )}
                        </DialogContent>
                      </Dialog>
                      {canTakeAction(req.status) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleAction(req.id, "approve")}
                            disabled={processing}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleAction(req.id, "reject")}
                            disabled={processing}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No approval requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
