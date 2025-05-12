import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { verifyResetToken } from "@/lib/password-reset";

/**
 * Reset Password page that serves as a redirector
 * 
 * This is an enhanced version that works with the secure cookie-based reset flow.
 * It doesn't expect a token in the URL, instead redirecting to an API endpoint
 * that will set an HTTP-only cookie and then redirect to the auth page.
 */
export default function ResetPasswordPage() {
  const [location, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // Check if we're at the legacy reset-password route (with query parameters)
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        
        if (token) {
          // For backward compatibility - redirect to auth page with token
          setLocation(`/auth?token=${token}`);
          return;
        }
        
        // Check if this is the new clean URL pattern (/password-reset/:userId)
        const pathParts = location.split('/');
        const isPasswordReset = pathParts[1] === 'password-reset';
        
        if (isPasswordReset) {
          // This is the new secure flow with cookie-based tokens
          // Verify that the token cookie is valid before redirecting
          
          const userId = pathParts[2]; // Extract user ID from URL
          if (!userId) {
            setError("Invalid password reset link. Missing user ID.");
            setIsProcessing(false);
            return;
          }
          
          // Verify the token from the cookie
          const verifyResult = await verifyResetToken();
          
          if (!verifyResult.success) {
            setError(verifyResult.error || "Invalid or expired reset link. Please request a new one.");
            setIsProcessing(false);
            return;
          }
          
          // Successfully validated cookie-based token, redirect to auth page in reset password mode
          toast({
            title: "Password Reset",
            description: "Please enter your new password to complete the reset process.",
          });
          
          // Redirect to auth page with resetPassword tab active and add a token parameter 
          // This is a workaround to save the state that a password reset was initiated
          setLocation('/auth?tab=resetPassword&reset=true');
        } else {
          // Unexpected state - redirect to auth page
          console.log("No reset parameters found, redirecting to auth page");
          setLocation('/auth');
        }
      } catch (err) {
        console.error("Error processing password reset:", err);
        setError("An unexpected error occurred. Please try again or request a new reset link.");
        setIsProcessing(false);
      }
    };
    
    handlePasswordReset();
  }, [location, setLocation, toast]);
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4 max-w-md text-center">
          <p className="font-medium mb-2">Error</p>
          <p>{error}</p>
        </div>
        <button
          className="text-blue-600 hover:text-blue-800 underline mt-2"
          onClick={() => setLocation('/auth?tab=forgotPassword')}
        >
          Request a new password reset link
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-[#8B4513] mb-4" />
      <p className="text-gray-600">Processing password reset...</p>
    </div>
  );
}