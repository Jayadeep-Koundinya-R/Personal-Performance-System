import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { FEATURE_FLAGS } from "@/config/features";
import { ThemeProvider } from "@/hooks/use-theme";
import { useAuth, AuthProvider, User } from "@/hooks/use-auth";
import { DashboardProviders } from "@/providers/AppProviders";
import HomePage from "./pages/Home";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import OnboardingPage from "./pages/Onboarding";
import SettingsPage from "./pages/Settings";
import { OnboardingGuard } from "./routes/OnboardingGuard";
import ResetPasswordPage from "./pages/ResetPassword";
import PricingPage from "./pages/Pricing";
import PrivacyPage from "./pages/Privacy";
import TermsPage from "./pages/Terms";
import FocusCallWindow from "./pages/FocusCallWindow";
import MeetingRoom from "./pages/MeetingRoom";
import MarketplacePage from "./pages/Marketplace";
import RoadmapPage from "./pages/Roadmap";
import NotFound from "./pages/NotFound";
import PwaUpdatePrompt from "@/components/ui/PwaUpdatePrompt";
import { initNativeNotifications, sendWelcomeNotification } from "@/lib/native-notifications";

const NativeAppController = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let removeListener: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const handle = await CapApp.addListener("backButton", ({ canGoBack }) => {
          // 1. If an open modal / sheet / popover exists, close it via Escape key
          const openDialog = document.querySelector(
            '[role="dialog"], [role="alertdialog"], [data-state="open"][data-radix-portal]'
          );
          if (openDialog) {
            document.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "Escape",
                code: "Escape",
                keyCode: 27,
                which: 27,
                bubbles: true,
                cancelable: true,
              })
            );
            return;
          }

          // 2. If on a nested route (not home / dashboard), navigate back
          const isRoot = location.pathname === "/" || location.pathname === "/dashboard";
          if (!isRoot && (canGoBack || window.history.length > 1)) {
            navigate(-1);
            return;
          }

          // 3. If on root route, exit or minimize app
          CapApp.exitApp();
        });

        removeListener = () => {
          handle.remove();
        };
      } catch {
        // Fallback silently if not running in native Capacitor environment
      }
    };

    setupListener();

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [location.pathname, navigate]);

  return null;
};

function AppRoutes() {
  const { user } = useAuth();
  const currentUser: User = user || { email: null, isGuest: true };

  return (
    <DashboardProviders user={currentUser}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/onboarding"
          element={
            <OnboardingGuard>
              <OnboardingPage />
            </OnboardingGuard>
          }
        />
        <Route
          path="/dashboard"
          element={
            <OnboardingGuard>
              <DashboardPage />
            </OnboardingGuard>
          }
        />
        <Route
          path="/focus-rooms"
          element={
            <OnboardingGuard>
              <DashboardPage />
            </OnboardingGuard>
          }
        />
        <Route
          path="/social"
          element={
            <OnboardingGuard>
              <DashboardPage />
            </OnboardingGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <OnboardingGuard>
              <SettingsPage />
            </OnboardingGuard>
          }
        />
        <Route path="/pricing" element={<PricingPage />} />
        {FEATURE_FLAGS.ENABLE_TEACHER_MARKETPLACE ? (
          <>
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/classes" element={<MarketplacePage />} />
          </>
        ) : (
          <>
            <Route path="/marketplace" element={<Navigate to="/dashboard" replace />} />
            <Route path="/classes" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {FEATURE_FLAGS.ENABLE_VIDEO_ROOMS ? (
          <>
            <Route
              path="/focus-call/:groupId"
              element={
                <OnboardingGuard>
                  <FocusCallWindow />
                </OnboardingGuard>
              }
            />
            <Route
              path="/meet/:roomId"
              element={
                <OnboardingGuard>
                  <MeetingRoom />
                </OnboardingGuard>
              }
            />
          </>
        ) : (
          <>
            <Route path="/focus-call/:groupId" element={<Navigate to="/dashboard" replace />} />
            <Route path="/meet/:roomId" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </DashboardProviders>
  );
}

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
              <AuthProvider>
                <NativeAppController />
                <PerformanceMonitor />
                <PwaUpdatePrompt />
                <AppRoutes />
              </AuthProvider>
            </HashRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
