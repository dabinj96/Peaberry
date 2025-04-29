import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PasswordStrengthIndicator } from "@/components/password-strength-indicator";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { 
  signInWithGoogle, 
  handleGoogleRedirectResult, 
  authenticateWithServer
} from "@/lib/firebase";
import {
  requestPasswordReset,
  verifyResetToken,
  resetPassword as resetPasswordWithToken
} from "@/lib/password-reset";
import { FcGoogle } from "react-icons/fc"; // FC = Flat Color Google icon

// Login form schema
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Registration form schema
const registerSchema = insertUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  bio: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// Password reset request schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// Password reset confirmation schema
const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords do not match",
  path: ["confirmNewPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  
  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  
  // Password reset states
  const [resetCode, setResetCode] = useState<string | null>(null);
  const [isRequestingPasswordReset, setIsRequestingPasswordReset] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetRequestSuccess, setResetRequestSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Import toast functionality from the UI
  const { toast } = useToast();

  // Handle Google redirect result on page load
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        setFirebaseError(null);
        setIsFirebaseLoading(true);
        const result = await handleGoogleRedirectResult();
        
        if (result && result.user) {
          console.log("Successfully authenticated with Google, sending to server...");
          try {
            // Send token to server to create session and update query client
            const userData = await authenticateWithServer(result);
            
            // Show success toast
            toast({
              title: "Successfully signed in with Google",
              description: `Welcome${userData.name ? ", " + userData.name : ""}! You've been signed in successfully.`,
              variant: "default",
            });
            
            // Redirect to home page
            setLocation("/");
          } catch (serverError: any) {
            console.error("Server authentication failed:", serverError);
            setFirebaseError("Server authentication failed: " + serverError.message);
          }
        }
      } catch (error: any) {
        console.error("Error handling redirect:", error);
        setFirebaseError(error.message);
      } finally {
        setIsFirebaseLoading(false);
      }
    };
    
    handleRedirect();
  }, [setLocation, toast]);

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    try {
      setFirebaseError(null);
      setIsFirebaseLoading(true);
      const result = await signInWithGoogle();
      
      if (result && result.user) {
        console.log("Signed in with Google, sending to server...");
        try {
          // Send token to server to create session and update query client
          const userData = await authenticateWithServer(result);
          
          // Show success toast
          toast({
            title: "Successfully signed in with Google",
            description: `Welcome${userData.name ? ", " + userData.name : ""}! You've been signed in successfully.`,
            variant: "default",
          });
          
          // Redirect to home page
          setLocation("/");
        } catch (serverError: any) {
          console.error("Server authentication failed:", serverError);
          setFirebaseError("Server authentication failed: " + serverError.message);
        }
      }
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      setFirebaseError(error.message);
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  // Handle tab state
  const [activeTab, setActiveTab] = useState<string>(window.location.search.includes('tab=register') ? 'register' : 'login');
  
  // Handle URL changes
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check for token in the URL (for our new server-side password reset)
    const token = searchParams.get('token');
    if (token) {
      setActiveTab('resetPassword');
      setResetCode(token);
      return;
    }
    
    // Support for legacy Firebase reset password mode 
    const mode = searchParams.get('mode');
    if (mode === 'resetPassword') {
      const oobCode = searchParams.get('oobCode');
      if (oobCode) {
        setActiveTab('resetPassword');
        setResetCode(oobCode);
        return;
      }
    }
    
    const tabParam = searchParams.has('tab') ? searchParams.get('tab') as string : 'login';
    setActiveTab(tabParam);
  }, [window.location.search]);
  
  // Listen for tab change events from the header component
  useEffect(() => {
    const handleTabChangeEvent = (event: CustomEvent<string>) => {
      setActiveTab(event.detail);
    };
    
    // Add event listener
    window.addEventListener('tabChange', handleTabChangeEvent as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('tabChange', handleTabChangeEvent as EventListener);
    };
  }, []);
  
  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Update URL based on tab
    if (value === 'register') {
      window.history.replaceState(null, '', '?tab=register');
    } else if (value === 'forgotPassword') {
      window.history.replaceState(null, '', '?tab=forgotPassword');
    } else if (value === 'resetPassword' && resetCode) {
      // Keep the reset code in the URL (support both new token format and legacy Firebase oobCode)
      if (window.location.search.includes('token=')) {
        window.history.replaceState(null, '', `?token=${resetCode}`);
      } else if (window.location.search.includes('oobCode=')) {
        window.history.replaceState(null, '', `?mode=resetPassword&oobCode=${resetCode}`);
      } else {
        // Default to new token format
        window.history.replaceState(null, '', `?token=${resetCode}`);
      }
    } else {
      window.history.replaceState(null, '', '/auth');
    }
    
    // Clear any reset errors when switching tabs
    if (value !== 'forgotPassword' && value !== 'resetPassword') {
      setResetError(null);
    }
  };
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      name: "",
      password: "",
      confirmPassword: "",
      bio: "",
    },
  });

  // Form submission handlers
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };
  
  // Password reset forms
  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });
  
  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmNewPassword: "",
    },
  });
  
  // Password reset handlers
  const onForgotPasswordSubmit = async (data: ForgotPasswordFormValues) => {
    setResetError(null);
    setIsRequestingPasswordReset(true);
    setResetRequestSuccess(false);
    
    try {
      // Use our new server-side password reset flow
      const result = await requestPasswordReset(data.email);
      
      if (result.success) {
        // Request was successful
        setResetRequestSuccess(true);
        toast({
          title: "Reset email sent",
          description: result.message || "If an account with that email exists, you'll receive a password reset link.",
          variant: "default",
        });
        
        // Log for development/testing
        console.log("Password reset email sent to", data.email);
      } else {
        // Handle specific error cases
        if (result.error?.includes("Google Sign-In")) {
          // This is for OAuth-only users
          setResetError("This account uses Google Sign-In. Please use Google to sign in.");
        } else if (result.error?.includes("Too many")) {
          // Rate limiting error
          setResetError("Too many reset attempts. Please try again later.");
        } else {
          // Other errors
          setResetError(result.error || "An error occurred. Please try again later.");
        }
      }
    } catch (error: any) {
      console.error("Error requesting password reset:", error);
      setResetError("Network error. Please check your connection and try again.");
    } finally {
      setIsRequestingPasswordReset(false);
    }
  };
  
  const onResetPasswordSubmit = async (data: ResetPasswordFormValues) => {
    if (!resetCode) {
      setResetError("Invalid reset link. Please request a new one.");
      return;
    }
    
    setResetError(null);
    setIsResettingPassword(true);
    setResetSuccess(false);
    
    try {
      // First verify the token is valid with our server
      const verifyResult = await verifyResetToken(resetCode);
      
      if (!verifyResult.success) {
        setResetError(verifyResult.error || "Invalid or expired reset link. Please request a new one.");
        return;
      }
      
      console.log(`Verified reset token for user: ${verifyResult.username || verifyResult.email}`);
      
      // If valid, use our reset password API to update the password
      const resetResult = await resetPasswordWithToken(resetCode, data.newPassword);
      
      if (!resetResult.success) {
        setResetError(resetResult.error || "Failed to reset password. Please try again.");
        return;
      }
      
      // Password reset successful
      setResetSuccess(true);
      toast({
        title: "Password reset successful",
        description: resetResult.message || "Your password has been reset. You can now login with your new password.",
        variant: "default",
      });
      
      // Clear reset code and redirect to login after a delay
      setTimeout(() => {
        setResetCode(null);
        handleTabChange('login');
      }, 3000);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      setResetError("An error occurred. Please try again later.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (user) {
    return null; // Prevents flashing content before redirect
  }

  return (
    <div className="min-h-[calc(100vh-64px-88px)] flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-[#8B4513] mb-2">Welcome to Peaberry</h1>
            <p className="text-gray-700">Discover and explore Boston's vibrant specialty coffee scene.</p>
          </div>
          
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Create Account</TabsTrigger>
            </TabsList>
            
            {/* Hidden tabs for password reset flow */}
            {activeTab === 'forgotPassword' && (
              <div className="mb-4 flex items-center">
                <Button 
                  variant="link" 
                  className="p-0 flex items-center text-sm text-gray-600 hover:text-gray-900"
                  onClick={() => handleTabChange('login')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to login
                </Button>
                <span className="text-lg font-medium ml-auto">Forgot Password</span>
              </div>
            )}
            
            {activeTab === 'resetPassword' && (
              <div className="mb-4 flex items-center">
                <Button 
                  variant="link" 
                  className="p-0 flex items-center text-sm text-gray-600 hover:text-gray-900"
                  onClick={() => handleTabChange('login')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to login
                </Button>
                <span className="text-lg font-medium ml-auto">Reset Password</span>
              </div>
            )}
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login to your account</CardTitle>
                  <CardDescription>Enter your credentials to access your account.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Username
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Password
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showLoginPassword ? "text" : "password"} 
                                  placeholder="Enter your password" 
                                  {...field} 
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                                  tabIndex={-1}
                                >
                                  {showLoginPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                  )}
                                  <span className="sr-only">
                                    {showLoginPassword ? "Hide password" : "Show password"}
                                  </span>
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Forgot Password Link */}
                      <div className="text-right">
                        <Button 
                          type="button" 
                          variant="link" 
                          className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800"
                          onClick={() => handleTabChange('forgotPassword')}
                        >
                          Forgot password?
                        </Button>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-[#A0522D] hover:bg-[#8B4513]"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Logging in..." : "Login"}
                      </Button>
                    </form>
                  </Form>
                  
                  {/* OAuth sign-in options */}
                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300"></span>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or continue with</span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleGoogleSignIn}
                        disabled={isFirebaseLoading}
                      >
                        <FcGoogle className="h-5 w-5" /> 
                        {isFirebaseLoading ? "Connecting..." : "Sign in with Google"}
                      </Button>
                    </div>
                    
                    {firebaseError && (
                      <p className="mt-2 text-sm text-red-600">{firebaseError}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="forgotPassword">
              <Card>
                <CardHeader>
                  <CardTitle>Forgot Password</CardTitle>
                  <CardDescription>Enter your email address to receive a password reset link.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...forgotPasswordForm}>
                    <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                      <FormField
                        control={forgotPasswordForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Email
                            </FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {resetError && (
                        <div className="flex items-center text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          <span>{resetError}</span>
                        </div>
                      )}
                      
                      {resetRequestSuccess && (
                        <div className="bg-green-50 p-3 rounded border border-green-200 text-green-800 text-sm">
                          Check your email for a password reset link. The link will expire in 1 hour.
                        </div>
                      )}
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-[#A0522D] hover:bg-[#8B4513]"
                        disabled={isRequestingPasswordReset}
                      >
                        {isRequestingPasswordReset ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending reset link...
                          </>
                        ) : (
                          "Send reset link"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="resetPassword">
              <Card>
                <CardHeader>
                  <CardTitle>Reset Password</CardTitle>
                  <CardDescription>Enter your new password to complete the reset process.</CardDescription>
                </CardHeader>
                <CardContent>
                  {!resetCode ? (
                    <div className="bg-red-50 p-3 rounded border border-red-200 text-red-800 text-sm">
                      Invalid or expired reset link. Please request a new password reset link.
                    </div>
                  ) : resetSuccess ? (
                    <div className="bg-green-50 p-3 rounded border border-green-200 text-green-800 text-sm">
                      Your password has been reset successfully. You will be redirected to the login page shortly.
                    </div>
                  ) : (
                    <Form {...resetPasswordForm}>
                      <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                        <FormField
                          control={resetPasswordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                New Password
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showNewPassword ? "text" : "password"} 
                                    placeholder="Enter new password" 
                                    {...field} 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    tabIndex={-1}
                                  >
                                    {showNewPassword ? (
                                      <EyeOff className="h-4 w-4 text-gray-500" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-gray-500" />
                                    )}
                                    <span className="sr-only">
                                      {showNewPassword ? "Hide password" : "Show password"}
                                    </span>
                                  </Button>
                                </div>
                              </FormControl>
                              <PasswordStrengthIndicator password={field.value} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={resetPasswordForm.control}
                          name="confirmNewPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Confirm New Password
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showConfirmNewPassword ? "text" : "password"} 
                                    placeholder="Confirm new password" 
                                    {...field} 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                    tabIndex={-1}
                                  >
                                    {showConfirmNewPassword ? (
                                      <EyeOff className="h-4 w-4 text-gray-500" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-gray-500" />
                                    )}
                                    <span className="sr-only">
                                      {showConfirmNewPassword ? "Hide password" : "Show password"}
                                    </span>
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {resetError && (
                          <div className="flex items-center text-red-600 text-sm">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            <span>{resetError}</span>
                          </div>
                        )}
                        
                        <Button 
                          type="submit" 
                          className="w-full bg-[#A0522D] hover:bg-[#8B4513]"
                          disabled={isResettingPassword}
                        >
                          {isResettingPassword ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Resetting password...
                            </>
                          ) : (
                            "Reset Password"
                          )}
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create a new account</CardTitle>
                  <CardDescription>Fill in your details to join Peaberry.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              Full Name <span className="text-red-500 ml-1">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              Username <span className="text-red-500 ml-1">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Choose a username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              Email <span className="text-red-500 ml-1">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              Password <span className="text-red-500 ml-1">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showRegisterPassword ? "text" : "password"} 
                                  placeholder="Create a password" 
                                  {...field} 
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                  tabIndex={-1}
                                >
                                  {showRegisterPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                  )}
                                  <span className="sr-only">
                                    {showRegisterPassword ? "Hide password" : "Show password"}
                                  </span>
                                </Button>
                              </div>
                            </FormControl>
                            <PasswordStrengthIndicator password={field.value} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              Confirm Password <span className="text-red-500 ml-1">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showConfirmPassword ? "text" : "password"} 
                                  placeholder="Confirm your password" 
                                  {...field} 
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  tabIndex={-1}
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                  )}
                                  <span className="sr-only">
                                    {showConfirmPassword ? "Hide password" : "Show password"}
                                  </span>
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                            {field.value && registerForm.watch('password') !== field.value && (
                              <div className="text-red-500 text-xs mt-1 flex items-center">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Passwords don't match
                              </div>
                            )}
                            {field.value && registerForm.watch('password') === field.value && field.value.length > 0 && (
                              <div className="text-green-500 text-xs mt-1 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Passwords match
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Tell us about yourself" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-[#A0522D] hover:bg-[#8B4513]"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                  
                  {/* OAuth sign-up options */}
                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300"></span>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or sign up with</span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleGoogleSignIn}
                        disabled={isFirebaseLoading}
                      >
                        <FcGoogle className="h-5 w-5" /> 
                        {isFirebaseLoading ? "Connecting..." : "Sign up with Google"}
                      </Button>
                    </div>
                    
                    {firebaseError && (
                      <p className="mt-2 text-sm text-red-600">{firebaseError}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="hidden lg:flex items-center justify-center">
          <div className="relative w-full h-[600px] rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-black/30 z-10 flex flex-col justify-end p-8">
              <h2 className="text-white text-3xl font-serif font-bold mb-4">Discover Boston's Best Coffee</h2>
              <p className="text-white text-lg mb-6">Join our community of coffee enthusiasts and explore the rich coffee culture of Boston.</p>
              <div className="flex gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 flex-1">
                  <div className="text-white text-2xl font-bold">50+</div>
                  <div className="text-white/80 text-sm">Specialty Cafés</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 flex-1">
                  <div className="text-white text-2xl font-bold">2.5k+</div>
                  <div className="text-white/80 text-sm">Community Members</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 flex-1">
                  <div className="text-white text-2xl font-bold">1k+</div>
                  <div className="text-white/80 text-sm">Reviews & Ratings</div>
                </div>
              </div>
            </div>
            <img
              src="https://images.unsplash.com/photo-1497935586351-b67a49e012bf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80"
              alt="Boston Coffee Scene"
              className="absolute inset-0 object-cover w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
