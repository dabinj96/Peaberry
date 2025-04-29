import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

/**
 * Reset Password page that serves as a redirector
 * 
 * This is an enhanced version that works with the secure cookie-based reset flow.
 * It doesn't expect a token in the URL, instead redirecting to an API endpoint
 * that will set an HTTP-only cookie and then redirect to the auth page.
 */
export default function ResetPasswordPage() {
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // Check if we're at the legacy reset-password route (with query parameters)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      // For backward compatibility - redirect to auth page with token
      console.log("Using legacy password reset flow with URL token");
      setLocation(`/auth?token=${token}`);
      return;
    }
    
    // Check if this is the new clean URL pattern (/password-reset/:userId)
    const pathParts = location.split('/');
    const isPasswordReset = pathParts[1] === 'password-reset';
    
    if (isPasswordReset) {
      // We're already in the new flow - the server API will handle setting the cookie
      // No need to do anything as the server has already set the cookie and redirected
      console.log("Password reset flow in progress...");
    } else {
      // Unexpected state - redirect to auth page
      console.log("No reset parameters found, redirecting to auth page");
      setLocation('/auth');
    }
  }, [location, setLocation]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-brown-600 mb-4" />
      <p className="text-gray-600">Processing password reset...</p>
    </div>
  );
}