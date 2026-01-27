/**
 * Governance Policies Management
 * Feature flag: ENABLE_ENTERPRISE_GOVERNANCE_UI
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileCheck, ArrowLeft, Search, AlertCircle, Play, Eye } from "lucide-react";

interface PolicyCondition {
  field: string;
  operator: string;
  value: unknown;
}

interface Policy {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  effect: "allow" | "warn" | "block";
  actions: string[];
  resources: string[];
  conditions: PolicyCondition[];
  isActive: boolean;
  priority: number;
}

interface EvaluationResult {
  allowed: boolean;
  effect: "allow" | "warn" | "block";
  matchedPolicies: string[];
  messages: string[];
}

export default function GovernancePolicies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  async function fetchPolicies() {
    try {
      const res = await fetch("/api/admin/governance/policies", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Access denied");
          return;
        }
        throw new Error("Failed to fetch policies");
      }
      const data = await res.json();
      setPolicies(data.policies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function evaluatePolicy(policyId: string) {
    setEvaluating(true);
    setEvalResult(null);
    try {
      const res = await fetch(`/api/admin/governance/policies/${policyId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "view",
          resource: "contents",
          context: {},
        }),
      });
      if (!res.ok) throw new Error("Failed to evaluate policy");
      const data = await res.json();
      setEvalResult(data);
    } catch (err) {
    } finally {
      setEvaluating(false);
    }
  }

  const filteredPolicies = policies.filter(
    policy =>
      policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const effectColors: Record<string, string> = {
    allow: "bg-green-100 text-green-800",
    warn: "bg-yellow-100 text-yellow-800",
    block: "bg-red-100 text-red-800",
  };

  if (loading) {
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
            <FileCheck className="h-6 w-6" />
            Policy Enforcement
          </h1>
          <p className="text-gray-500">Manage and evaluate access policies</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Policies ({policies.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search policies..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy</TableHead>
                <TableHead>Effect</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Resources</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPolicies.map(policy => (
                <TableRow key={policy.id}>
                  <TableCell>
                    <div className="font-medium">{policy.displayName}</div>
                    <div className="text-sm text-gray-500">{policy.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={effectColors[policy.effect] || ""}>{policy.effect}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {policy.actions.length > 0 ? (
                        policy.actions.slice(0, 3).map(action => (
                          <Badge key={action} variant="outline" className="text-xs">
                            {action}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">All</span>
                      )}
                      {policy.actions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{policy.actions.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {policy.resources.length > 0 ? (
                        policy.resources.slice(0, 2).map(resource => (
                          <Badge key={resource} variant="outline" className="text-xs">
                            {resource}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">All</span>
                      )}
                      {policy.resources.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{policy.resources.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{policy.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={policy.isActive ? "default" : "secondary"}>
                      {policy.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPolicy(policy)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{policy.displayName}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Description</label>
                              <p className="text-gray-600">
                                {policy.description || "No description"}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Effect</label>
                                <p>
                                  <Badge className={effectColors[policy.effect]}>
                                    {policy.effect}
                                  </Badge>
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Priority</label>
                                <p className="text-gray-600">{policy.priority}</p>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Conditions</label>
                              {policy.conditions.length > 0 ? (
                                <div className="mt-1 space-y-1">
                                  {policy.conditions.map((cond, i) => (
                                    <div key={i} className="text-sm bg-gray-100 p-2 rounded">
                                      {cond.field} {cond.operator} {String(cond.value)}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-400">No conditions</p>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => evaluatePolicy(policy.id)}
                        disabled={evaluating}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPolicies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No policies found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {evalResult && (
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Allowed:</span>
                <Badge variant={evalResult.allowed ? "default" : "destructive"}>
                  {evalResult.allowed ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Effect:</span>
                <Badge className={effectColors[evalResult.effect]}>{evalResult.effect}</Badge>
              </div>
              {evalResult.messages.length > 0 && (
                <div>
                  <span className="font-medium">Messages:</span>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {evalResult.messages.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
