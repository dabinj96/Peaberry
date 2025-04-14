import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordStrengthIndicator } from "@/components/password-strength-indicator";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  signInWithGoogle, 
  handleGoogleRedirectResult, 
  authenticateWithServer 
} from "@/lib/firebase";
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

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

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
          
          <Tabs defaultValue={window.location.search.includes('tab=register') ? 'register' : 'login'} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Create Account</TabsTrigger>
            </TabsList>
            
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
                            <FormLabel>Username</FormLabel>
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
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
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
                            <FormLabel>Full Name</FormLabel>
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
                            <FormLabel>Username</FormLabel>
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
                            <FormLabel>Email</FormLabel>
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
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Create a password" {...field} />
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
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm your password" {...field} />
                            </FormControl>
                            <FormMessage />
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
