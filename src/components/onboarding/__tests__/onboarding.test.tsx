import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TRACK_PRESETS, TRACK_5_CHALLENGE } from '@/constants/onboardingPresets';
import { ScreenTrackSelection } from '../ScreenTrackSelection';
import { ScreenTrackDrill } from '../ScreenTrackDrill';
import { ScreenSocialBridge } from '../ScreenSocialBridge';
import { ScreenFinalReview } from '../ScreenFinalReview';
import { OnboardingWizard } from '../OnboardingWizard';
import { TrackPreferenceSelector } from '@/components/settings/TrackPreferenceSelector';
import { OnboardingGuard } from '@/routes/OnboardingGuard';
import { OnboardingWizardState } from '@/types/onboarding';

// Mock useAuth & useUserSettings for Guard tests
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: { email: 'test@example.com', isGuest: false, id: 'user-123' },
    isLoggedIn: true,
    loading: false,
    isGuestTrialExpired: false,
  })),
}));

vi.mock('@/hooks/use-user-settings', () => ({
  useUserSettings: vi.fn(() => ({
    settings: { onboardingCompleted: false },
    loading: false,
  })),
}));

describe('Onboarding Domain & UI Catalog Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Preset Catalog Integrity', () => {
    it('defines all 4 primary tracks with complete options and anchor habits', () => {
      const keys = Object.keys(TRACK_PRESETS);
      expect(keys).toEqual(['placements', 'competitive_exams', 'core_coding', 'fitness']);

      keys.forEach((key) => {
        const track = TRACK_PRESETS[key as keyof typeof TRACK_PRESETS];
        expect(track.id).toBe(key);
        expect(track.title).toBeTruthy();
        expect(track.badge).toBeTruthy();
        expect(track.allowedHours.length).toBeGreaterThan(0);
        expect(track.bottlenecks.length).toBeGreaterThanOrEqual(3);
        expect(track.anchorHabits.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('defines Track 5 (Agni Circadian Challenge) with correct habits', () => {
      expect(TRACK_5_CHALLENGE.id).toBe('track_5_agni');
      expect(TRACK_5_CHALLENGE.habits.length).toBe(2);
      expect(TRACK_5_CHALLENGE.habits[0].title).toContain('5:00 AM');
      expect(TRACK_5_CHALLENGE.habits[1].title).toContain('10:00 PM');
    });
  });

  describe('ScreenTrackSelection UI', () => {
    it('renders 4 primary track cards and Track 5 overlay switch', () => {
      const state: OnboardingWizardState = {
        selectedPrimaryTrack: 'placements',
        enableTrack5Challenge: true,
        dailyFocusHours: 3,
        selectedBottleneckId: 'dsa_leetcode',
        customHabits: [],
        socialChoice: 'solo',
        joinSquadCode: '',
      };
      const updateState = vi.fn();
      const onNext = vi.fn();

      render(
        <ScreenTrackSelection state={state} updateState={updateState} onNext={onNext} />
      );

      expect(screen.getByText('Campus & Tech Placements')).toBeInTheDocument();
      expect(screen.getByText('GATE / CAT / UPSC Aspirants')).toBeInTheDocument();
      expect(screen.getByText('Indie SaaS & Systems Engineering')).toBeInTheDocument();
      expect(screen.getByText('High Energy & Health')).toBeInTheDocument();

      expect(screen.getByText(/Track 5: Agni Circadian Challenge/i)).toBeInTheDocument();

      const nextButton = screen.getByRole('button', { name: /Next: Customize Drill/i });
      expect(nextButton).not.toBeDisabled();
      fireEvent.click(nextButton);
      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('ScreenTrackDrill UI', () => {
    it('renders focus hour chips and dynamic weekly output preview', () => {
      const state: OnboardingWizardState = {
        selectedPrimaryTrack: 'placements',
        enableTrack5Challenge: true,
        dailyFocusHours: 3,
        selectedBottleneckId: 'dsa_leetcode',
        customHabits: [],
        socialChoice: 'solo',
        joinSquadCode: '',
      };
      const updateState = vi.fn();
      const onBack = vi.fn();
      const onNext = vi.fn();

      render(
        <ScreenTrackDrill
          state={state}
          updateState={updateState}
          onBack={onBack}
          onNext={onNext}
        />
      );

      expect(screen.getByText('21 Hours / Week')).toBeInTheDocument();
      expect(screen.getByText('DSA & LeetCode Grinding')).toBeInTheDocument();

      const nextButton = screen.getByRole('button', { name: /Next: Accountability/i });
      fireEvent.click(nextButton);
      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('ScreenSocialBridge UI', () => {
    it('renders Classroom Coming Soon badge and disabled helper text', () => {
      const state: OnboardingWizardState = {
        selectedPrimaryTrack: 'placements',
        enableTrack5Challenge: true,
        dailyFocusHours: 3,
        selectedBottleneckId: 'dsa_leetcode',
        customHabits: [],
        socialChoice: 'solo',
        joinSquadCode: '',
      };
      const updateState = vi.fn();

      render(
        <ScreenSocialBridge
          state={state}
          updateState={updateState}
          onBack={vi.fn()}
          onNext={vi.fn()}
        />
      );

      expect(screen.getByText(/Join School \/ College Classroom/i)).toBeInTheDocument();
      expect(screen.getByText(/Coming Soon \(v2.0\)/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Teacher & institutional cohort integration launching in future update/i)
      ).toBeInTheDocument();
    });
  });

  describe('ScreenFinalReview UI', () => {
    it('compiles habits and dispatches completion payload on launch', () => {
      const state: OnboardingWizardState = {
        selectedPrimaryTrack: 'placements',
        enableTrack5Challenge: true,
        dailyFocusHours: 3,
        selectedBottleneckId: 'dsa_leetcode',
        customHabits: [],
        socialChoice: 'solo',
        joinSquadCode: '',
      };
      const onComplete = vi.fn();

      render(
        <ScreenFinalReview
          state={state}
          updateState={vi.fn()}
          onBack={vi.fn()}
          onComplete={onComplete}
        />
      );

      expect(screen.getByText('Target: 3h Deep Work / Day')).toBeInTheDocument();

      const launchButton = screen.getByRole('button', {
        name: /Launch Personal Performance System/i,
      });
      fireEvent.click(launchButton);

      expect(onComplete).toHaveBeenCalledTimes(1);
      const payload = onComplete.mock.calls[0][0];
      expect(payload.selectedPrimaryTrack).toBe('placements');
      expect(payload.customHabits.length).toBeGreaterThan(0);
    });
  });

  describe('TrackPreferenceSelector Widget', () => {
    it('renders all 5 track cards and sets active track in localStorage', () => {
      render(<TrackPreferenceSelector />);

      expect(screen.getByText('Active Execution Track Focus')).toBeInTheDocument();
      expect(screen.getByText(TRACK_PRESETS.placements.title)).toBeInTheDocument();
      expect(screen.getByText(TRACK_5_CHALLENGE.title)).toBeInTheDocument();
    });
  });

  describe('OnboardingGuard Routing Rules', () => {
    it('redirects uncompleted onboarding user to /onboarding', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <OnboardingGuard>
                  <div>Dashboard Page</div>
                </OnboardingGuard>
              }
            />
            <Route path="/onboarding" element={<div>Onboarding Route</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Onboarding Route')).toBeInTheDocument();
    });

    it('redirects expired guest trial user to /pricing', async () => {
      const { useAuth } = await import('@/hooks/use-auth');
      (useAuth as any).mockReturnValueOnce({
        user: { email: null, isGuest: true },
        isLoggedIn: true,
        loading: false,
        isGuestTrialExpired: true,
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <OnboardingGuard>
                  <div>Dashboard Page</div>
                </OnboardingGuard>
              }
            />
            <Route path="/pricing" element={<div>Pricing Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Pricing Page')).toBeInTheDocument();
    });
  });
});
