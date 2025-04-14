import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CafeWithDetails } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Lock, 
  AlertTriangle,
  X 
} from "lucide-react";
import CafeCard from "@/components/cafe-card";
import { apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Helper function to validate password complexity
const validatePasswordComplexity = (password: string) => {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  
  // Check for common passwords
  const commonPasswords = ["password", "123456", "qwerty", "welcome", "admin"];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: "This password is too common and not secure" };
  }
  
  // Check character variety
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  const varietyScore = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  if (varietyScore < 2) {
    return { 
      valid: false, 
      error: "Password must include at least 2 of the following: uppercase letters, lowercase letters, numbers, and special characters"
    };
  }
  
  return { valid: true, error: null };
};

// Define password change form schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .refine((password) => {
      const result = validatePasswordComplexity(password);
      return result.valid;
    }, {
      message: "Password doesn't meet complexity requirements"
    }),
  confirmPassword: z.string().min(1, { message: "Please confirm your new password" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Define account deletion form schema
const deleteAccountSchema = z.object({
  password: z.string().min(1, { message: "Password confirmation is required" })
});

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;
type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("favorites");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Password change form setup
  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });
  
  // Password change mutation
  const passwordChangeMutation = useMutation({
    mutationFn: async (data: { currentPassword: string, newPassword: string }) => {
      const response = await apiRequest("POST", "/api/change-password", data);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to change password");
      }
      return response.text();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your password has been changed successfully",
        variant: "default",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle password change form submission
  const onSubmit = (data: PasswordChangeFormValues) => {
    passwordChangeMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    });
  };

  // Fetch user favorites
  const { data: favorites = [], isLoading: isLoadingFavorites } = useQuery<CafeWithDetails[]>({
    queryKey: ["/api/favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) {
        throw new Error("Failed to fetch favorites");
      }
      return res.json();
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt={user.name} />
                    <AvatarFallback className="text-lg">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold">{user.name}</h2>
                  <p className="text-gray-500">@{user.username}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p>{user.email}</p>
                  </div>
                  
                  {user.bio && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Bio</h3>
                      <p>{user.bio}</p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Member Since</h3>
                    <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <Button 
                    onClick={handleLogout} 
                    variant="outline" 
                    className="w-full"
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? "Logging out..." : "Log Out"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
                <TabsTrigger value="ratings">My Ratings</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="favorites">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Favorite Cafés</CardTitle>
                    <CardDescription>
                      Cafés you've saved to visit again.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingFavorites ? (
                      <div className="py-12 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-border" />
                      </div>
                    ) : favorites.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-gray-500 mb-4">You haven't saved any cafés yet.</p>
                        <Button className="bg-[#A0522D] hover:bg-[#8B4513]" asChild>
                          <a href="/">Discover Cafés</a>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {favorites.map((cafe) => (
                          <CafeCard key={cafe.id} cafe={cafe} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ratings">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Ratings & Reviews</CardTitle>
                    <CardDescription>
                      Cafés you've rated and reviewed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="py-12 text-center">
                      <p className="text-gray-500">Your ratings will appear here once you start rating cafés.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>
                      Manage your account preferences.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-w-md mx-auto">
                      <div className="mb-8">
                        <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                          <Lock className="h-5 w-5" />
                          Change Password
                        </h3>
                        
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                              control={form.control}
                              name="currentPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Current Password</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="password" 
                                      placeholder="Enter your current password" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="newPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>New Password</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="password" 
                                      placeholder="Enter your new password" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Must be at least 8 characters long and include variety of characters
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="confirmPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Confirm New Password</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="password" 
                                      placeholder="Confirm your new password" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <Button 
                              type="submit" 
                              className="w-full bg-[#A0522D] hover:bg-[#8B4513]"
                              disabled={passwordChangeMutation.isPending}
                            >
                              {passwordChangeMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Changing Password...
                                </>
                              ) : (
                                "Change Password"
                              )}
                            </Button>
                          </form>
                        </Form>
                      </div>
                      
                      <div className="pt-6 mt-6 border-t">
                        <h3 className="text-lg font-medium flex items-center gap-2 mb-4 text-red-600">
                          <AlertTriangle className="h-5 w-5" />
                          Delete Account
                        </h3>
                        
                        <p className="text-sm text-gray-600 mb-4">
                          Deleting your account is permanent and will remove all your data from our system, including favorites, ratings, and reviews.
                        </p>
                        
                        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
                              Delete Account
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            
                            <DeleteAccountForm
                              user={user}
                              onSuccess={() => {
                                toast({
                                  title: "Account Deleted",
                                  description: "Your account has been successfully deleted.",
                                  variant: "default",
                                });
                                setLocation("/");
                              }}
                              onCancel={() => setDeleteDialogOpen(false)}
                            />
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

// DeleteAccountForm Component
function DeleteAccountForm({
  user,
  onSuccess,
  onCancel
}: {
  user: any;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOAuthUser = !!user.providerId;
  
  // Delete account form
  const deleteForm = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: {
      password: "",
    }
  });
  
  // Handle delete account form submission
  const onSubmitDelete = async (data: DeleteAccountFormValues) => {
    try {
      setIsDeleting(true);
      setError(null);
      
      console.log("Submitting delete account form", { password: data.password ? "provided" : "not provided" });
      
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: data.password
        }),
        credentials: "same-origin"
      });
      
      console.log("Delete account response status:", response.status);
      
      let responseData;
      const responseText = await response.text();
      console.log("Raw response:", responseText);
      
      try {
        if (responseText) {
          responseData = JSON.parse(responseText);
        } else {
          // Handle empty response
          responseData = { success: response.ok };
        }
      } catch (err) {
        console.error("Error parsing response:", err);
        if (response.ok) {
          // If the response is OK but not JSON, we'll assume success
          responseData = { success: true };
        } else {
          throw new Error(responseText || "Failed to parse server response");
        }
      }
      
      console.log("Delete account parsed response:", responseData);
      
      if (!response.ok) {
        throw new Error(responseData?.message || responseText || "Failed to delete account");
      }
      
      console.log("Account deletion successful");
      toast({
        title: "Success",
        description: "Your account has been successfully deleted.",
        variant: "default",
      });
      
      onSuccess();
    } catch (err: any) {
      console.error("Account deletion error:", err);
      setError(err.message || "An unexpected error occurred");
      toast({
        title: "Error",
        description: err.message || "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <>
      <Form {...deleteForm}>
        <form onSubmit={deleteForm.handleSubmit(onSubmitDelete)} className="space-y-6 py-4">
          {!isOAuthUser && (
            <FormField
              control={deleteForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter your password to confirm" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
              {error}
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete My Account"
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </Form>
    </>
  );
}