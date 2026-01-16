import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, Users, Trash2, Edit2, Eye, EyeOff, X } from "lucide-react";
import { Redirect } from "wouter";

type User = {
  id: string;
  username: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: "admin" | "editor" | "author" | "contributor" | "viewer";
  isActive: boolean;
  createdAt: string;
};

const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  role: z.enum(["admin", "editor", "author", "contributor", "viewer"]),
});

const editUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  role: z.enum(["admin", "editor", "author", "contributor", "viewer"]),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  isActive: z.boolean(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

export default function UsersPage() {
  const { user: currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && currentUser?.role === "admin",
  });

  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "editor",
    },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "editor",
      password: "",
      isActive: true,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateOpen(false);
      createForm.reset();
      setShowPassword(false);
      toast({
        title: "User created",
        description: "The user has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EditUserFormData> }) => {
      const cleanedData: Record<string, unknown> = { ...data };
      if (!cleanedData.password) {
        delete cleanedData.password;
      }
      if (cleanedData.email === "") {
        delete cleanedData.email;
      }
      const response = await apiRequest("PATCH", `/api/users/${id}`, cleanedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      setShowEditPassword(false);
      toast({
        title: "User updated",
        description: "The user has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiRequest("POST", "/api/users/bulk-delete", { ids });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setSelectedIds([]);
      toast({
        title: "Users deleted",
        description: `${data.deletedCount} user(s) deleted successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete users",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.role,
      password: "",
      isActive: user.isActive,
    });
  };

  const handleCreateSubmit = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleEditSubmit = (data: EditUserFormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected user(s)?`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all except current user
      setSelectedIds(users.filter(u => u.id !== currentUser?.id).map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, userId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUser?.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account",
        variant: "destructive",
      });
      return;
    }
    if (confirm(`Are you sure you want to delete ${user.username || user.email}?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  if (currentUser?.role !== "admin") {
    return <Redirect to="/admin" />;
  }

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    editor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    author: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    contributor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    viewer: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-semibold">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            createForm.reset();
            setShowPassword(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user with username and password login.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="johndoe"
                          data-testid="input-user-username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Min 8 characters"
                            data-testid="input-user-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John"
                            data-testid="input-user-firstname"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Doe"
                            data-testid="input-user-lastname"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          data-testid="input-user-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-user-role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin - Full access</SelectItem>
                          <SelectItem value="editor">Editor - Edit & publish</SelectItem>
                          <SelectItem value="author">Author - Create & edit own</SelectItem>
                          <SelectItem value="contributor">Contributor - Create only</SelectItem>
                          <SelectItem value="viewer">Viewer - Read only</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    data-testid="button-submit-user"
                  >
                    {createUserMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Create User
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users
          </CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? "s" : ""} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-md mb-4" data-testid="bulk-actions-toolbar">
              <span className="text-sm font-medium">{selectedIds.length} selected</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                data-testid="button-bulk-delete-users"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                data-testid="button-clear-selection"
              >
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found. Create your first user to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === users.filter(u => u.id !== currentUser?.id).length && users.length > 1}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all-users"
                    />
                  </TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={(checked) => handleSelectOne(user.id, !!checked)}
                        disabled={user.id === currentUser?.id}
                        data-testid={`checkbox-user-${user.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.username || "-"}</TableCell>
                    <TableCell>
                      {user.firstName || user.lastName 
                        ? `${user.firstName || ""} ${user.lastName || ""}`.trim() 
                        : "-"}
                    </TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={roleColors[user.role] || ""}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditClick(user)}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(user)}
                          disabled={user.id === currentUser?.id}
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => {
        if (!open) {
          setEditingUser(null);
          setShowEditPassword(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.username}</DialogTitle>
            <DialogDescription>
              Update user details and permissions.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          data-testid="input-edit-user-firstname"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          data-testid="input-edit-user-lastname"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        data-testid="input-edit-user-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showEditPassword ? "text" : "password"}
                          placeholder="Leave blank to keep current"
                          data-testid="input-edit-user-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                        >
                          {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Leave blank to keep the current password
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-user-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin - Full access</SelectItem>
                        <SelectItem value="editor">Editor - Edit & publish</SelectItem>
                        <SelectItem value="author">Author - Create & edit own</SelectItem>
                        <SelectItem value="contributor">Contributor - Create only</SelectItem>
                        <SelectItem value="viewer">Viewer - Read only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Inactive users cannot log in
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-user-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  data-testid="button-update-user"
                >
                  {updateUserMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Update User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
