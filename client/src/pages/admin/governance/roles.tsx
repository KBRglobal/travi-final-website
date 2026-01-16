/**
 * Governance Roles Management
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
import {
  Shield,
  ArrowLeft,
  Users,
  Plus,
  Search,
  AlertCircle,
} from "lucide-react";

interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  priority: number;
  isSystem: boolean;
  isActive: boolean;
  userCount?: number;
}

export default function GovernanceRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    try {
      const res = await fetch("/api/admin/governance/roles", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Access denied");
          return;
        }
        throw new Error("Failed to fetch roles");
      }
      const data = await res.json();
      setRoles(data.roles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Shield className="h-6 w-6" />
            Roles & Permissions
          </h1>
          <p className="text-gray-500">Manage access control roles</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Roles ({roles.length})</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="font-medium">{role.displayName}</div>
                    <div className="text-sm text-gray-500">{role.name}</div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {role.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{role.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      {role.userCount || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.isActive ? "default" : "secondary"}>
                      {role.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {role.isSystem && (
                      <Badge variant="outline" className="ml-1">
                        System
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRole(role)}
                        >
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{role.displayName}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Name</label>
                            <p className="text-gray-600">{role.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Description</label>
                            <p className="text-gray-600">{role.description || "No description"}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Priority</label>
                              <p className="text-gray-600">{role.priority}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Status</label>
                              <p>
                                <Badge variant={role.isActive ? "default" : "secondary"}>
                                  {role.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </p>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRoles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No roles found
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
