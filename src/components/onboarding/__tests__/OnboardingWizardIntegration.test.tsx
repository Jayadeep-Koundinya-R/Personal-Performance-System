import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnboardingWizard } from '../OnboardingWizard';
import { ScreenFinalReview } from '../ScreenFinalReview';
import { OnboardingGuard } from '@/routes/OnboardingGuard';
import { TRACK_PRESETS, TRACK_5_CHALLENGE } from '@/constants/onboardingPresets';
import { OnboardingWizardState } from '@/types/onboarding';

// --- Mocks Setup ---
const mockRpc = vi.fn();
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  or: vi.fn().mockResolvedValue({ data: null, error: null }),
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: vi.fn(() => ({
      update: (...args: any[]) => mockUpdate(...args),
      select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
      }),
    },
  },
}));

const mockHapticsImpact = vi.fn().mockResolvedValue(undefined);
const mockHapticsNotification = vi.fn().mockResolvedValue(undefined);

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: (...args: any[]) => mockHapticsImpact(...args),
    notification: (...args: any[]) => mockHapticsNotification(...args),
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
  NotificationType: {
    Success: 'SUCCESS',
    Warning: 'WARNING',
    Error: 'ERROR',
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
  },
}));

const mockAppExit = vi.fn().mockResolvedValue(undefined);
const mockAppAddListener = vi.fn().mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) });

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (...args: any[]) => mockAppAddListener(...args),
    exitApp: (...args: any[]) => mockAppExit(...args),
  },
}));

let mockAuthState = {
  user: { id: 'test-user-id', email: 'test@example.com', isGuest: false } as any,
  isLoggedIn: true,
  loading: false,
};

let mockUserSettingsState = {
  settings: { onboardingCompleted: false } as any,
  loading: false,
};

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('@/hooks/use-user-settings', () => ({
  useUserSettings: () => mockUserSettingsState,
}));

function renderWithProviders(ui: React.ReactElement, initialRoute: string = '/onboarding') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('OnboardingWizard Full Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });
    mockAuthState = {
      user: { id: 'test-user-id', email: 'test@example.com', isGuest: false },
      isLoggedIn: true,
      loading: false,
    };
    mockUserSettingsState = {
      settings: { onboardingCompleted: false },
      loading: false,
    };
  });

  describe('1. End-to-End Wizard Flow & Screen Transitions', () => {
    it('seamlessly transitions from Screen 1 -> Screen 2 -> Screen 3 -> Screen 4', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/onboarding" element={<OnboardingWizard />} />
          <Route path="/dashboard" element={<div>Dashboard Landed</div>} />
        </Routes>
      );

      // --- Screen 1: Track Selection ---
      expect(screen.getByText('Choose Your Execution Track')).toBeInTheDocument();
      expect(screen.getByText('Campus & Tech Placements')).toBeInTheDocument();
      expect(screen.getByText('Track 5: Agni Circadian Challenge')).toBeInTheDocument();

      // Click placements track card
      fireEvent.click(screen.getByText('Campus & Tech Placements'));
      expect(mockHapticsImpact).toHaveBeenCalled();

      // Click Next: Customize Drill
      const nextBtn1 = screen.getByRole('button', { name: /Next: Customize Drill/i });
      fireEvent.click(nextBtn1);

      // --- Screen 2: Drill & Hours ---
      await waitFor(() => {
        expect(screen.getByText('Customize Focus Target & Bottleneck')).toBeInTheDocument();
      });
      expect(screen.getByText(/Estimated Weekly Output/i)).toBeInTheDocument();

      // Click 3h hour chip
      const threeHourBtn = screen.getByRole('button', { name: /3h \/ day/i });
      fireEvent.click(threeHourBtn);

      // Select bottleneck radio card
      fireEvent.click(screen.getByText('DSA & LeetCode Grinding'));

      // Click Next: Accountability
      const nextBtn2 = screen.getByRole('button', { name: /Next: Accountability/i });
      fireEvent.click(nextBtn2);

      // --- Screen 3: Social Accountability Bridge ---
      await waitFor(() => {
        expect(screen.getByText('Social Accountability Bridge')).toBeInTheDocument();
      });
      expect(screen.getByText('Solo Focus')).toBeInTheDocument();
      expect(screen.getByText('Create a Squad')).toBeInTheDocument();

      // Select Solo Focus
      fireEvent.click(screen.getByText('Solo Focus'));

      // Click Next: Final Review
      const nextBtn3 = screen.getByRole('button', { name: /Next: Final Review/i });
      fireEvent.click(nextBtn3);

      // --- Screen 4: Final Habit Blueprint ---
      await waitFor(() => {
        expect(screen.getByText('Your Habit Blueprint & System Launch')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Launch Personal Performance System/i })).toBeInTheDocument();
    });
  });

  describe('2. Habit Customization & Track 5 Challenge Append', () => {
    it('appends both Agni circadian challenge habits when Track 5 is enabled', () => {
      const stateWithTrack5: OnboardingWizardState = {
        selectedPrimaryTrack: 'placements',
        enableTrack5Challenge: true,
        dailyFocusHours: 3,
        selectedBottleneckId: 'dsa_leetcode',
        customHabits: [],
        socialChoice: 'solo',
        joinSquadCode: '',
      };

      render(
        <ScreenFinalReview
          state={stateWithTrack5}
          updateState={vi.fn()}
          onBack={vi.fn()}
          onComplete={vi.fn()}
        />
      );

      // Verify anchor habits exist
      expect(screen.getByDisplayValue('Solve 2 DSA / LeetCode Problems')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Core CS Theory & OS/DBMS Revision')).toBeInTheDocument();

      // Verify both Track 5 challenge habits exist
      expect(screen.getByDisplayValue('Rise & Hydrate by 5:00 AM')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Digital Curfew & Wind-down by 10:00 PM')).toBeInTheDocument();
      expect(screen.getByText(/Track 5 Agni Challenge Active/i)).toBeInTheDocument();
    });

    it('excludes Agni challenge habits when Track 5 is disabled', () => {
      const stateWithoutTrack5: OnboardingWizardState = {
        selectedPrimaryTrack: 'core_coding',
        enableTrack5Challenge: false,
        dailyFocusHours: 3,
        selectedBottleneckId: 'feature_delivery',
        customHabits: [],
        socialChoice: 'solo',
        joinSquadCode: '',
      };

      render(
        <ScreenFinalReview
          state={stateWithoutTrack5}
          updateState={vi.fn()}
          onBack={vi.fn()}
          onComplete={vi.fn()}
        />
      );

      // Coding anchor habits exist
      expect(screen.getByDisplayValue('Push 1 Production Git Commit')).toBeInTheDocument();

      // Agni habits must NOT exist
      expect(screen.queryByDisplayValue('Rise & Hydrate by 5:00 AM')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('Digital Curfew & Wind-down by 10:00 PM')).not.toBeInTheDocument();
      expect(screen.queryByText(/Track 5 Agni Challenge Active/i)).not.toBeInTheDocument();
    });
  });

  describe('3. Atomic Supabase RPC Payload Formatting', () => {
    it('invokes supabase.rpc with complete_onboarding and strictly valid contract', async () => {
      const onCompleteMock = vi.fn();

      renderWithProviders(
        <Routes>
          <Route
            path="/onboarding"
            element={
              <OnboardingWizard
                initialState={{
                  selectedPrimaryTrack: 'competitive_exams',
                  enableTrack5Challenge: true,
                  dailyFocusHours: 4,
                  selectedBottleneckId: 'mcq_speed',
                  socialChoice: 'create_squad',
                  joinSquadCode: 'EXAM99',
                }}
                onComplete={onCompleteMock}
              />
            }
          />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>
      );

      // Fast-forward to Screen 4 by clicking Next 3 times
      const next1 = screen.getByRole('button', { name: /Next: Customize Drill/i });
      fireEvent.click(next1);

      await waitFor(() => screen.getByRole('button', { name: /Next: Accountability/i }));
      fireEvent.click(screen.getByRole('button', { name: /Next: Accountability/i }));

      await waitFor(() => screen.getByRole('button', { name: /Next: Final Review/i }));
      fireEvent.click(screen.getByRole('button', { name: /Next: Final Review/i }));

      await waitFor(() => screen.getByRole('button', { name: /Launch Personal Performance System/i }));

      // Launch the system
      const launchBtn = screen.getByRole('button', { name: /Launch Personal Performance System/i });
      fireEvent.click(launchBtn);

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledTimes(1);
      });

      // Verify RPC function name
      const [rpcFunction, rpcArgs] = mockRpc.mock.calls[0];
      expect(rpcFunction).toBe('complete_onboarding');

      // Verify payload contract
      expect(rpcArgs).toHaveProperty('p_payload');
      const payload = rpcArgs.p_payload;
      expect(payload.selectedPrimaryTrack).toBe('competitive_exams');
      expect(payload.enableTrack5Challenge).toBe(true);
      expect(payload.dailyFocusHours).toBe(4);
      expect(payload.selectedBottleneckId).toBe('mcq_speed');
      expect(payload.socialChoice).toBe('create_squad');
      expect(payload.joinSquadCode).toBe('EXAM99');

      // Custom habits must include 3 exam habits + 2 Agni habits = 5 habits
      expect(Array.isArray(payload.customHabits)).toBe(true);
      expect(payload.customHabits.length).toBe(5);

      // Verify each habit item format
      payload.customHabits.forEach((habit: any) => {
        expect(habit).toHaveProperty('id');
        expect(habit).toHaveProperty('title');
        expect(habit).toHaveProperty('category');
        expect(habit).toHaveProperty('time_of_day');
        expect(habit).toHaveProperty('target_count');
      });

      // Success haptic triggered
      expect(mockHapticsNotification).toHaveBeenCalledWith({
        type: 'SUCCESS',
      });

      // Parent callback fired
      expect(onCompleteMock).toHaveBeenCalledWith(expect.objectContaining({
        selectedPrimaryTrack: 'competitive_exams',
      }));
    });
  });

  describe('4. OnboardingGuard Redirection Rules', () => {
    it('redirects unauthenticated users to /login', () => {
      mockAuthState = {
        user: null,
        isLoggedIn: false,
        loading: false,
      };

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <OnboardingGuard>
                  <div>Protected Dashboard</div>
                </OnboardingGuard>
              }
            />
            <Route path="/login" element={<div>Login Page Target</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Login Page Target')).toBeInTheDocument();
      expect(screen.queryByText('Protected Dashboard')).not.toBeInTheDocument();
    });

    it('redirects authenticated user with onboarding_completed === false to /onboarding', () => {
      mockAuthState = {
        user: { id: 'user-1', email: 'test@example.com', isGuest: false },
        isLoggedIn: true,
        loading: false,
      };
      mockUserSettingsState = {
        settings: { onboardingCompleted: false },
        loading: false,
      };

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <OnboardingGuard>
                  <div>Protected Dashboard</div>
                </OnboardingGuard>
              }
            />
            <Route path="/onboarding" element={<div>Onboarding Route Target</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Onboarding Route Target')).toBeInTheDocument();
      expect(screen.queryByText('Protected Dashboard')).not.toBeInTheDocument();
    });

    it('keeps authenticated user with onboarding_completed === false on /onboarding', () => {
      mockAuthState = {
        user: { id: 'user-1', email: 'test@example.com', isGuest: false },
        isLoggedIn: true,
        loading: false,
      };
      mockUserSettingsState = {
        settings: { onboardingCompleted: false },
        loading: false,
      };

      render(
        <MemoryRouter initialEntries={['/onboarding']}>
          <Routes>
            <Route
              path="/onboarding"
              element={
                <OnboardingGuard>
                  <div>Onboarding Screen Active</div>
                </OnboardingGuard>
              }
            />
            <Route path="/dashboard" element={<div>Dashboard Route</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Onboarding Screen Active')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Route')).not.toBeInTheDocument();
    });

    it('redirects authenticated user with onboarding_completed === true to /dashboard if visiting /onboarding', () => {
      mockAuthState = {
        user: { id: 'user-1', email: 'test@example.com', isGuest: false },
        isLoggedIn: true,
        loading: false,
      };
      mockUserSettingsState = {
        settings: { onboardingCompleted: true },
        loading: false,
      };

      render(
        <MemoryRouter initialEntries={['/onboarding']}>
          <Routes>
            <Route
              path="/onboarding"
              element={
                <OnboardingGuard>
                  <div>Onboarding Screen</div>
                </OnboardingGuard>
              }
            />
            <Route path="/dashboard" element={<div>Dashboard Landed Target</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard Landed Target')).toBeInTheDocument();
      expect(screen.queryByText('Onboarding Screen')).not.toBeInTheDocument();
    });

    it('renders children when profile prop indicates onboarding_completed: true', () => {
      mockAuthState = {
        user: { id: 'user-1', email: 'test@example.com', isGuest: false },
        isLoggedIn: true,
        loading: false,
      };

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <OnboardingGuard profile={{ onboarding_completed: true }}>
                  <div>Profile Verified Dashboard</div>
                </OnboardingGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Profile Verified Dashboard')).toBeInTheDocument();
    });
  });
});
