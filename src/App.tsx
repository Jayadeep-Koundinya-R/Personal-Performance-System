import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import HomePage from "./pages/Home";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import ResetPasswordPage from "./pages/ResetPassword";
import PricingPage from "./pages/Pricing";
import PrivacyPage from "./pages/Privacy";
import TermsPage from "./pages/Terms";
import FocusCallWindow from "./pages/FocusCallWindow";
import MeetingRoom from "./pages/MeetingRoom";
import NotFound from "./pages/NotFound";
import PwaUpdatePrompt from "@/components/ui/PwaUpdatePrompt";
import { initNativeNotifications, sendWelcomeNotification } from "@/lib/native-notifications";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize native notification channel & prompt permissions on install
    initNativeNotifications().then((granted) => {
      if (granted && !localStorage.getItem("pps_welcome_notified")) {
        sendWelcomeNotification();
        localStorage.setItem("pps_welcome_notified", "true");
      }
    });
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <HashRouter>
              <PerformanceMonitor />
              <PwaUpdatePrompt />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/focus-call/:groupId" element={<FocusCallWindow />} />
                <Route path="/meet/:roomId" element={<MeetingRoom />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
