import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useUserSettings } from '@/hooks/use-user-settings';
import { Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const OnboardingGuard: React.FC<Props> = ({ children }) => {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading } = useUserSettings();
  const location = useLocation();

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase">
            Verifying Execution Status...
          </p>
        </div>
      </div>
    );
  }

  // Rule 1: If unauthenticated, redirect to /login
  if (!isLoggedIn || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const onboardingCompleted = settings?.onboardingCompleted ?? false;
  const isOnboardingRoute = location.pathname === '/onboarding';

  // Rule 2: If authenticated and onboarding_completed === false, redirect to /onboarding
  if (!onboardingCompleted && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  // Rule 3: If route is /onboarding and onboarding_completed === true, redirect to /dashboard
  if (onboardingCompleted && isOnboardingRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise, render children
  return <>{children}</>;
};
