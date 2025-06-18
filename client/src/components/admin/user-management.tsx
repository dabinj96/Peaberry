import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  UserX, 
  RefreshCw,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Type for local users only
interface LocalUser {
  id: number;
  username: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'cafe_owner';
  createdAt: string;
}

export default function UserManagement() {
  const { toast } = useToast();

  // Query to fetch local users only
  const { 
    data: users,
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers
  } = useQuery<LocalUser[]>({
    queryKey: ["/api/admin/users"],
    refetchOnWindowFocus: false,
  });

  // Mutation to delete a single user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been successfully removed from the database.",
      });
      refetchUsers();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete user",
        description: error.message || "An error occurred while deleting the user",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="text-2xl font-bold">User Management</h2>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetchUsers()}
          disabled={isLoadingUsers}
        >
          {isLoadingUsers ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* User listing table */}
      <Card>
        <CardHeader>
          <CardTitle>Local Users</CardTitle>
          <CardDescription>
            Users registered with email and password in the system (OAuth users are not shown).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : usersError ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load users: {(usersError as Error).message}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name || user.username}</div>
                          <div className="text-sm text-muted-foreground">ID: {user.id}</div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deleteUserMutation.isPending}
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete user ${user.name || user.username}?`)) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                          >
                            {deleteUserMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserX className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        No local users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}