/**
 * Governance Dashboard
 * Feature flag: ENABLE_ENTERPRISE_GOVERNANCE_UI
 */

import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Shield,
  FileCheck,
  History,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
} from "lucide-react";

interface GovernanceSummary {
  enabled: boolean;
  counts: {
    activeUsers: number;
    activeRoles: number;
    activePolicies: number;
    pendingApprovals: number;
    recentAuditEvents: number;
  };
  flags: {
    rbacEnabled: boolean;
    approvalsEnabled: boolean;
    auditEnabled: boolean;
    policiesEnabled: boolean;
  };
}

export default function GovernanceDashboard() {
  const [summary, setSummary] = useState<GovernanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  async function fetchSummary() {
    try {
      const res = await fetch("/api/admin/governance/summary", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Access denied. Please log in with admin privileges.");
          return;
        }
        throw new Error("Failed to fetch governance summary");
      }
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
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

  if (!summary?.enabled) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Enterprise Governance Disabled</h2>
              <p className="text-gray-500">
                Set ENABLE_ENTERPRISE_GOVERNANCE=true to enable governance features.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Roles",
      value: summary.counts.activeRoles,
      icon: Shield,
      href: "/admin/governance/roles",
      color: "text-blue-600",
      enabled: summary.flags.rbacEnabled,
    },
    {
      title: "Active Policies",
      value: summary.counts.activePolicies,
      icon: FileCheck,
      href: "/admin/governance/policies",
      color: "text-[#6443F4]",
      enabled: summary.flags.policiesEnabled,
    },
    {
      title: "Pending Approvals",
      value: summary.counts.pendingApprovals,
      icon: Clock,
      href: "/admin/governance/approvals",
      color: "text-orange-600",
      enabled: summary.flags.approvalsEnabled,
    },
    {
      title: "Recent Audit Events",
      value: summary.counts.recentAuditEvents,
      icon: History,
      href: "/admin/governance/audit",
      color: "text-green-600",
      enabled: summary.flags.auditEnabled,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Enterprise Governance</h1>
          <p className="text-gray-500">Manage roles, policies, approvals, and audit trails</p>
        </div>
        <div className="flex gap-2">
          {Object.entries(summary.flags).map(([key, value]) => (
            <Badge key={key} variant={value ? "default" : "secondary"}>
              {key.replace("Enabled", "").replace(/([A-Z])/g, " $1").trim()}
              {value ? (
                <CheckCircle className="h-3 w-3 ml-1" />
              ) : (
                <AlertCircle className="h-3 w-3 ml-1" />
              )}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${!card.enabled ? "opacity-50" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                {!card.enabled && (
                  <span className="text-xs text-gray-400">Disabled</span>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/governance/roles">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Manage Roles & Permissions
              </Button>
            </Link>
            <Link href="/admin/governance/users">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Assign User Roles
              </Button>
            </Link>
            <Link href="/admin/governance/policies">
              <Button variant="outline" className="w-full justify-start">
                <FileCheck className="h-4 w-4 mr-2" />
                Configure Policies
              </Button>
            </Link>
            <Link href="/admin/governance/approvals">
              <Button variant="outline" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" />
                Review Pending Approvals
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Active Users</span>
                <Badge variant="outline">{summary.counts.activeUsers}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>RBAC Engine</span>
                <Badge variant={summary.flags.rbacEnabled ? "default" : "secondary"}>
                  {summary.flags.rbacEnabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Approval Workflows</span>
                <Badge variant={summary.flags.approvalsEnabled ? "default" : "secondary"}>
                  {summary.flags.approvalsEnabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Audit Logging</span>
                <Badge variant={summary.flags.auditEnabled ? "default" : "secondary"}>
                  {summary.flags.auditEnabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Policy Enforcement</span>
                <Badge variant={summary.flags.policiesEnabled ? "default" : "secondary"}>
                  {summary.flags.policiesEnabled ? "Active" : "Disabled"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
