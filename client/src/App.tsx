import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import CafeDetailPage from "@/pages/cafe-detail-page";
import ProfilePage from "@/pages/profile-page";
import AdminPage from "@/pages/admin-page";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "@/lib/protected-route";
import { AdminProtectedRoute } from "@/lib/admin-protected-route";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/cafe/:id" component={CafeDetailPage} />
          <ProtectedRoute path="/profile" component={ProfilePage} />
          <AdminProtectedRoute path="/admin" component={AdminPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
