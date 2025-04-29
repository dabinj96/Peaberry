import { useEffect } from "react";
import { Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";

/**
 * Reset Password page that serves as a redirector
 * This page catches the reset-password route and redirects to the auth page with the token
 */
export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Extract token and email from URL parameters
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      // Redirect to auth page with token
      setLocation(`/auth?token=${token}`);
    } else {
      // No token found, redirect to auth page
      setLocation('/auth');
    }
  }, [setLocation]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-brown-600 mb-4" />
      <p className="text-gray-600">Redirecting to password reset...</p>
    </div>
  );
}