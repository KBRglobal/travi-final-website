/**
 * Governance User Role Assignment
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
  Users,
  ArrowLeft,
  Search,
  AlertCircle,
  Shield,
  Plus,
} from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  role: string;
  isActive: boolean;
  governanceRoles?: string[];
}

interface Role {
  id: string;
  name: string;
  displayName: string;
}

export default function GovernanceUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchRoles()]);
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/governance/users", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchRoles() {
    try {
      const res = await fetch("/api/admin/governance/roles", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch roles");
      const data = await res.json();
      setRoles(data.roles || []);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    }
  }

  async function assignRole() {
    if (!selectedUser || !selectedRoleId) return;

    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/access-control/users/${selectedUser.id}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ roleId: selectedRoleId }),
      });

      if (!res.ok) throw new Error("Failed to assign role");

      await fetchUsers();
      setSelectedRoleId("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to assign role");
    } finally {
      setAssigning(false);
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
            <Users className="h-6 w-6" />
            User Role Assignment
          </h1>
          <p className="text-gray-500">Assign governance roles to users</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Users ({users.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Legacy Role</TableHead>
                <TableHead>Governance Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name || user.username}</div>
                    <div className="text-sm text-gray-500">@{user.username}</div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.governanceRoles?.length ? (
                        user.governanceRoles.map((roleId) => {
                          const role = roles.find((r) => r.id === roleId);
                          return (
                            <Badge key={roleId} variant="secondary">
                              {role?.displayName || roleId}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-gray-400 text-sm">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Roles
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Assign Role to {user.name || user.username}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Current Roles</label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {user.governanceRoles?.length ? (
                                user.governanceRoles.map((roleId) => {
                                  const role = roles.find((r) => r.id === roleId);
                                  return (
                                    <Badge key={roleId}>{role?.displayName || roleId}</Badge>
                                  );
                                })
                              ) : (
                                <span className="text-gray-400">No roles assigned</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Assign New Role</label>
                            <div className="flex gap-2 mt-1">
                              <Select
                                value={selectedRoleId}
                                onValueChange={setSelectedRoleId}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select role..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.displayName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={assignRole}
                                disabled={!selectedRoleId || assigning}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Assign
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No users found
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
