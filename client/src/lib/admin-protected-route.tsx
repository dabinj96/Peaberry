import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

/**
 * A route component that only allows access to admin users
 * For now, we'll hardcode admin access for specific usernames until
 * we implement proper roles in the database schema
 */
export function AdminProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  
  // List of admin usernames
  const adminUsernames = ['admin', 'testuser']; // Add your admin usernames here

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Check if the user is logged in
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
  
  // Check if the user has admin access
  if (!adminUsernames.includes(user.username)) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}