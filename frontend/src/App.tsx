import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import type { Company } from "@shared/schema";

import LoginPage from "@/pages/auth/login";
import VerifyOTP from "@/pages/auth/verify-otp";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminSubscriptions from "@/pages/admin/subscriptions";
import AdminInvoices from "@/pages/admin/invoices";
import AdminPayments from "@/pages/admin/payments";
import AdminReports from "@/pages/admin/reports";
import AdminQuotationTemplates from "@/pages/admin/quotation-templates";
import AdminSettings from "@/pages/admin/settings";
import InternalDashboard from "@/pages/internal/dashboard";
import InternalInvoices from "@/pages/internal/invoices";
import UserBrowse from "@/pages/user/browse";
import UserSubscriptions from "@/pages/user/subscriptions";
import UserInvoices from "@/pages/user/invoices";
import UserProfile from "@/pages/user/profile";
import ForgotPassword from "@/pages/auth/forgot-password";
import ResetPassword from "@/pages/auth/reset-password";

function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const { setPrimaryColor } = useTheme();
  const [location] = useLocation();

  const { data: company } = useQuery<Company>({
    queryKey: [user?.companyId ? `/api/companies/${user.companyId}` : null],
    enabled: !!user?.companyId,
  });

  useEffect(() => {
    if (company?.primaryColor) {
      setPrimaryColor(company.primaryColor);
    }
  }, [company, setPrimaryColor]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const rolePrefix = `/${user.role}`;
  if (location === "/" || !location.startsWith(rolePrefix)) {
    return <Redirect to={rolePrefix} />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-3 border-b sticky top-0 bg-background z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <Switch>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/products" component={AdminProducts} />
              <Route path="/admin/subscriptions" component={AdminSubscriptions} />
              <Route path="/admin/invoices" component={AdminInvoices} />
              <Route path="/admin/payments" component={AdminPayments} />
              <Route path="/admin/quotation-templates" component={AdminQuotationTemplates} />
              <Route path="/admin/reports" component={AdminReports} />
              <Route path="/admin/settings" component={AdminSettings} />

              <Route path="/internal" component={InternalDashboard} />
              <Route path="/internal/invoices" component={InternalInvoices} />

              <Route path="/user" component={UserBrowse} />
              <Route path="/user/subscriptions" component={UserSubscriptions} />
              <Route path="/user/invoices" component={UserInvoices} />
              <Route path="/user/profile" component={UserProfile} />

              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

import { GoogleOAuthProvider } from "@react-oauth/google";

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              <Switch>
                <Route path="/forgot-password" component={ForgotPassword} />
                <Route path="/reset-password" component={ResetPassword} />
                <Route path="/verify-otp" component={VerifyOTP} />
                <Route>
                  <ProtectedLayout />
                </Route>
              </Switch>
            </AuthProvider>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
