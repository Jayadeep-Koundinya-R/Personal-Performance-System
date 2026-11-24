import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Keyboard } from "@capacitor/keyboard";
import { handleHardwareBackDecision } from "@/lib/mobile/backButtonHandler";
import { FEATURE_FLAGS } from "@/config/features";
import { ThemeProvider } from "@/hooks/use-theme";
import { useAuth, AuthProvider, User } from "@/hooks/use-auth";
import { DashboardProviders } from "@/providers/AppProviders";
import HomePage from "./pages/Home";
import { OnboardingGuard } from "./routes/OnboardingGuard";
import PwaUpdatePrompt from "@/components/ui/PwaUpdatePrompt";
import { initNativeNotifications, sendWelcomeNotification } from "@/lib/native-notifications";
import { AppLockModal } from "@/components/auth/AppLockModal";
import { useAppLock, AppLockProvider } from "@/hooks/use-app-lock";

const LoginPage = lazy(() => import("./pages/Login"));
const DashboardPage = lazy(() => import("./pages/Dashboard"));
const OnboardingPage = lazy(() => import("./pages/Onboarding"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));
const PricingPage = lazy(() => import("./pages/Pricing"));
const PrivacyPage = lazy(() => import("./pages/Privacy"));
const TermsPage = lazy(() => import("./pages/Terms"));
const FocusCallWindow = lazy(() => import("./pages/FocusCallWindow"));
const MeetingRoom = lazy(() => import("./pages/MeetingRoom"));
const MarketplacePage = lazy(() => import("./pages/Marketplace"));
const RoadmapPage = lazy(() => import("./pages/Roadmap"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
      <div className="h-2 w-24 bg-muted/60 rounded-full animate-pulse" />
    </div>
  </div>
);

const AppLockRootController = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { isLocked, hasBiometrics, unlockWithPin, unlockWithBiometrics } = useAppLock();

  // Public paths where App Lock should NEVER appear:
  const publicPaths = ["/", "/login", "/pricing", "/privacy", "/terms", "/reset-password", "/roadmap"];
  const isPublicRoute = publicPaths.includes(location.pathname.toLowerCase());

  // Strictly gate lock overlay: only active for logged-in sessions on protected routes
  const shouldShowLock = isLocked && Boolean(user) && !isPublicRoute;

  return (
    <AppLockModal
      isOpen={shouldShowLock}
      hasBiometrics={hasBiometrics}
      onUnlock={unlockWithPin}
      onBiometricPrompt={unlockWithBiometrics}
    />
  );
};

const NativeAppController = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Keyboard Lifecycle Management
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const showPromise = Keyboard.addListener("keyboardWillShow", (info) => {
        document.body.classList.add("keyboard-open");
        document.documentElement.style.setProperty("--keyboard-height", `${info.keyboardHeight}px`);
      });
      const hidePromise = Keyboard.addListener("keyboardWillHide", () => {
        document.body.classList.remove("keyboard-open");
        document.documentElement.style.removeProperty("--keyboard-height");
      });

      return () => {
        showPromise.then((h) => h?.remove()).catch(() => {});
        hidePromise.then((h) => h?.remove()).catch(() => {});
      };
    } catch {
      // Graceful fallback for non-native browsers
    }
  }, []);

  // 2. Hardware Back Button Hierarchical Dismissal
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const handle = await CapApp.addListener("backButton", async ({ canGoBack }) => {
          const hasOpenModal = Boolean(
            document.querySelector(
              '[role="dialog"], [role="alertdialog"], [data-state="open"][data-radix-portal], .pps-modal-open'
            )
          );

          const decision = handleHardwareBackDecision({
            hasOpenModal,
            currentPath: location.pathname,
            canGoBack,
          });

          // Level 1: Close active modal or sheet
          if (decision.type === "close_modal") {
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
            window.dispatchEvent(new CustomEvent("pps_close_modals"));
            return;
          }

          // Level 2: Navigate back to root dashboard from sub-sections or sub-routes
          if (decision.type === "navigate_dashboard") {
            window.dispatchEvent(new CustomEvent("pps_sub_section_back"));
            if (location.pathname !== "/dashboard" && location.pathname !== "/") {
              navigate("/dashboard");
            }
            return;
          }

          // Level 3: Root Dashboard — Minimize Native App
          try {
            await CapApp.minimizeApp();
          } catch {
            CapApp.exitApp();
          }
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
      <Suspense fallback={<RouteFallback />}>
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
          path="/analytics"
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
      </Suspense>
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
            <Sonner position="top-center" />
            <HashRouter>
              <AuthProvider>
                <AppLockProvider>
                  <AppLockRootController />
                  <NativeAppController />
                  <PerformanceMonitor />
                  <PwaUpdatePrompt />
                  <AppRoutes />
                </AppLockProvider>
              </AuthProvider>
            </HashRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
