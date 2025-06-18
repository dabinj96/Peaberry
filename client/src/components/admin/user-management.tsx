import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  UserX, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  Users, 
  Repeat,
  Database 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogClose,
} from "@/components/ui/dialog";
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
          onClick={() => {
            refetchUsers();
            refetchOrphanedCheck();
          }}
          disabled={isLoadingUsers || isCheckingOrphaned}
        >
          {(isLoadingUsers || isCheckingOrphaned) ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Google OAuth Sync Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Google OAuth Synchronization
          </CardTitle>
          <CardDescription>
            Synchronize Google OAuth user data between Firebase Auth and the local database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            <p>Google OAuth user synchronization runs automatically every 24 hours. You can also trigger a manual sync if needed.</p>
            <p className="mt-1">This will:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Update local user profiles with the latest Google OAuth data</li>
              <li>Link existing email-matching accounts to their Google provider</li>
              <li>Identify users deleted from Google OAuth and remove their provider links</li>
            </ul>
          </div>
          
          <Button 
            onClick={() => syncFirebaseUsersMutation.mutate()}
            disabled={syncFirebaseUsersMutation.isPending}
            className="mt-2"
          >
            {syncFirebaseUsersMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing Google Users...
              </>
            ) : (
              <>
                <Repeat className="mr-2 h-4 w-4" />
                Sync Google OAuth Users
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Orphaned users alert */}
      {orphanedUsers && orphanedUsers.count > 0 && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Orphaned Google OAuth Users Detected</AlertTitle>
          <AlertDescription>
            Found {orphanedUsers.count} Google OAuth users in the database that no longer exist in Firebase.
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={() => handleShowCleanupDialog(orphanedUsers.users)}
            >
              View and Clean Up
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* User listing table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            All registered users in the system. For Google OAuth users, "active" indicates they exist in Firebase, "deleted" means they were removed from Firebase.
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
                    <TableHead>Auth Provider</TableHead>
                    <TableHead>OAuth Status</TableHead>
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
                          {user.providerId || 'Local'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(user.firebaseStatus) as any}>
                            {user.firebaseStatus}
                          </Badge>
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
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleanup confirmation dialog */}
      <Dialog open={isCleanupDialogOpen} onOpenChange={setIsCleanupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Google OAuth User Cleanup</DialogTitle>
            <DialogDescription>
              The following {selectedUsers.length} Google OAuth users exist in the database but not in Firebase. 
              Would you like to remove them from the database?
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Provider</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name || user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.providerId || 'Local'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCleanupDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCleanupConfirm}
              disabled={cleanupOrphanedUsersMutation.isPending}
            >
              {cleanupOrphanedUsersMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cleaning Up...
                </>
              ) : (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Clean Up Users
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}