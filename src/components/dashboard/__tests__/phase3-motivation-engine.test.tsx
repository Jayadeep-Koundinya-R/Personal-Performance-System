import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ParkinsonsLawInverterModal } from '@/components/habits/ParkinsonsLawInverterModal';
import { EmergencyTriageModal } from '@/components/dashboard/EmergencyTriageModal';
import { TriageActiveBanner } from '@/components/dashboard/TriageActiveBanner';
import { SyllabusDecomposerModal } from '@/components/syllabus/SyllabusDecomposerModal';
import { Habit } from '@/types/habit';

// --- Mocks Setup ---
const mockStartHabitFocus = vi.fn();
const mockChangeTimerMode = vi.fn();
const mockStartTimer = vi.fn();
const mockSetActiveTaskName = vi.fn();
const mockSetLinkedHabitId = vi.fn();

vi.mock('@/hooks/use-focus-timer', () => ({
  useFocusTimer: () => ({
    startHabitFocus: mockStartHabitFocus,
    changeTimerMode: mockChangeTimerMode,
    startTimer: mockStartTimer,
    setActiveTaskName: mockSetActiveTaskName,
    setLinkedHabitId: mockSetLinkedHabitId,
  }),
}));

const mockApplyStreakFreeze = vi.fn().mockResolvedValue(true);
const mockAddHabit = vi.fn().mockReturnValue(true);

const dummyHabits: Habit[] = [
  {
    id: 'habit-1',
    name: 'Operating Systems Kernel Design',
    category: 'Deep Work',
    frequency: 'daily',
    period: 'morning',
    priority: 'high',
    streakCount: 5,
    longestStreak: 12,
    completionHistory: [],
    completedToday: false,
    order: 0,
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'habit-2',
    name: 'Algorithms & Data Structures Drill',
    category: 'Deep Work',
    frequency: 'daily',
    period: 'afternoon',
    priority: 'high',
    streakCount: 8,
    longestStreak: 15,
    completionHistory: [],
    completedToday: false,
    order: 1,
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

vi.mock('@/hooks/use-habits', () => ({
  useHabits: () => ({
    habits: dummyHabits,
    applyStreakFreeze: mockApplyStreakFreeze,
    addHabit: mockAddHabit,
    getTodayStr: () => '2026-10-14',
    isHabitDueToday: () => true,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })),
  },
}));

describe('Phase 3: The Dopamine & Motivation Engine Integration Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Task 3.2: Parkinson\'s Law Inverter Modal', () => {
    it('does not render when isOpen is false', () => {
      render(
        <ParkinsonsLawInverterModal
          isOpen={false}
          onClose={() => {}}
        />
      );
      expect(screen.queryByText(/Parkinson’s Law Inverter/i)).toBeNull();
    });

    it('renders with selected habit and displays anti-procrastination slicing buttons', () => {
      render(
        <ParkinsonsLawInverterModal
          isOpen={true}
          onClose={() => {}}
          targetHabit={dummyHabits[0]}
        />
      );

      expect(screen.getByText(/Parkinson’s Law Inverter/i)).toBeInTheDocument();
      expect(screen.getByText(/Operating Systems Kernel Design/i)).toBeInTheDocument();
      expect(screen.getByText(/^10m$/i)).toBeInTheDocument();
      expect(screen.getByText(/^15m$/i)).toBeInTheDocument();
      expect(screen.getByText(/^20m$/i)).toBeInTheDocument();
    });

    it('updates dopamine contract when selecting different time horizon micro-sprints', () => {
      render(
        <ParkinsonsLawInverterModal
          isOpen={true}
          onClose={() => {}}
          targetHabit={dummyHabits[0]}
        />
      );

      // Default is 15 mins
      expect(screen.getByText(/in 15 minutes right now/i)).toBeInTheDocument();

      // Click 10m button
      const btn10 = screen.getByText(/^10m$/i);
      fireEvent.click(btn10);
      expect(screen.getByText(/in 10 minutes right now/i)).toBeInTheDocument();

      // Click 20m button
      const btn20 = screen.getByText(/^20m$/i);
      fireEvent.click(btn20);
      expect(screen.getByText(/in 20 minutes right now/i)).toBeInTheDocument();
    });

    it('launches focus sprint directly using useFocusTimer when action button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <ParkinsonsLawInverterModal
          isOpen={true}
          onClose={handleClose}
          targetHabit={dummyHabits[0]}
        />
      );

      const launchBtn = screen.getByText(/Launch 15m Micro-Sprint Now/i);
      fireEvent.click(launchBtn);

      expect(mockStartHabitFocus).toHaveBeenCalledWith(dummyHabits[0], 15);
      expect(handleClose).toHaveBeenCalled();
    });

    it('arms 48-hour artificial early horizon', () => {
      const handleClose = vi.fn();
      render(
        <ParkinsonsLawInverterModal
          isOpen={true}
          onClose={handleClose}
          targetHabit={dummyHabits[0]}
        />
      );

      // Early horizon checkbox is checked by default; launch sprint to trigger saving
      const launchBtn = screen.getByText(/Launch 15m Micro-Sprint Now/i);
      fireEvent.click(launchBtn);

      const savedHorizon = localStorage.getItem(`pps_early_horizon_${dummyHabits[0].id}`);
      expect(savedHorizon).toBeTruthy();
    });
  });

  describe('Task 3.3: Emergency Triage ("Panic Button") Component & Banner', () => {
    it('renders triage modal and lists available habits to isolate as non-negotiable objective', () => {
      render(
        <EmergencyTriageModal
          isOpen={true}
          onClose={() => {}}
        />
      );

      expect(screen.getByText(/Emergency Triage Mode/i)).toBeInTheDocument();
      expect(screen.getByText(/What is the single non-negotiable outcome that MUST happen today\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Operating Systems Kernel Design/i)).toBeInTheDocument();
      expect(screen.getByText(/Algorithms & Data Structures Drill/i)).toBeInTheDocument();
    });

    it('activates triage mode: preserves streaks with shield, saves 3-sprint plan to localStorage', async () => {
      const handleClose = vi.fn();
      render(
        <EmergencyTriageModal
          isOpen={true}
          onClose={handleClose}
        />
      );

      // Select first habit
      const firstHabitCard = screen.getByText(/Operating Systems Kernel Design/i);
      fireEvent.click(firstHabitCard);

      // Confirm triage activation
      const activateBtn = screen.getByText(/Engage Emergency Triage Protocol/i);
      fireEvent.click(activateBtn);

      await waitFor(() => {
        expect(mockApplyStreakFreeze).toHaveBeenCalled();
      });

      const triageState = localStorage.getItem('pps_emergency_triage_state');
      expect(triageState).toBeTruthy();
      const parsed = JSON.parse(triageState!);
      expect(parsed.isActive).toBe(true);
      expect(parsed.targetHabitName).toBe('Operating Systems Kernel Design');
      expect(parsed.sprint1Done).toBe(false);
      expect(parsed.sprint2Done).toBe(false);
      expect(parsed.sprint3Done).toBe(false);
      expect(handleClose).toHaveBeenCalled();
    });

    it('TriageActiveBanner renders active triage state with 1-click sprint launchers and exit control', () => {
      // Seed active triage state
      const mockTriageState = {
        isActive: true,
        targetHabitId: 'habit-1',
        targetHabitName: 'Operating Systems Kernel Design',
        activatedAt: new Date().toISOString(),
        sprint1Done: false,
        sprint2Done: false,
        sprint3Done: false,
      };
      localStorage.setItem('pps_emergency_triage_state', JSON.stringify(mockTriageState));

      const { unmount } = render(<TriageActiveBanner onOpenModal={() => {}} />);

      expect(screen.getByText(/Triage Protocol Active/i)).toBeInTheDocument();
      expect(screen.getByText(/Operating Systems Kernel Design/i)).toBeInTheDocument();
      expect(screen.getByText(/1\. Warmup \(15m\)/i)).toBeInTheDocument();

      // Launch Sprint 1 via Run button
      const runBtns = screen.getAllByText(/Run/i);
      fireEvent.click(runBtns[0]);
      expect(mockChangeTimerMode).toHaveBeenCalledWith('custom', 15);
      expect(mockStartTimer).toHaveBeenCalled();

      // Exit Triage
      const exitBtn = screen.getByText(/Exit Triage/i);
      fireEvent.click(exitBtn);

      const clearedState = localStorage.getItem('pps_emergency_triage_state');
      const parsedCleared = JSON.parse(clearedState!);
      expect(parsedCleared.isActive).toBe(false);
      unmount();
    });
  });

  describe('Task 3.4: Syllabus-to-Habit Decomposition Engine', () => {
    it('renders curated blueprints and schedule duration toggles (15 vs 30 days)', () => {
      render(
        <SyllabusDecomposerModal
          isOpen={true}
          onClose={() => {}}
        />
      );

      expect(screen.getByText(/Syllabus-to-Habit Decomposer/i)).toBeInTheDocument();
      expect(screen.getByText(/GATE CSE/i)).toBeInTheDocument();
      expect(screen.getByText(/LeetCode 75/i)).toBeInTheDocument();
      expect(screen.getByText(/UPSC/i)).toBeInTheDocument();
      expect(screen.getByText(/Full-Stack Modern Engineering/i)).toBeInTheDocument();

      // Toggle schedule duration
      const btn15Days = screen.getByText(/^15\s*d$/i);
      fireEvent.click(btn15Days);
      expect(screen.getByText(/Inject 15-Day Syllabus Track/i)).toBeInTheDocument();
    });

    it('injects 30-day sequential study tracks into real useHabits addHabit hook on commit', async () => {
      const handleClose = vi.fn();
      render(
        <SyllabusDecomposerModal
          isOpen={true}
          onClose={handleClose}
        />
      );

      // Select LeetCode blueprint
      const leetCodeCard = screen.getByText(/LeetCode 75/i);
      fireEvent.click(leetCodeCard);

      // Click Inject CTA
      const commitBtn = screen.getByText(/Inject 30-Day Syllabus Track/i);
      fireEvent.click(commitBtn);

      await waitFor(() => {
        expect(mockAddHabit).toHaveBeenCalled();
      });

      expect(mockAddHabit.mock.calls.length).toBeGreaterThanOrEqual(14);
      expect(handleClose).toHaveBeenCalled();
    });

    it('supports custom syllabus text extraction into daily drill habits', async () => {
      const handleClose = vi.fn();
      const { container } = render(
        <SyllabusDecomposerModal
          isOpen={true}
          onClose={handleClose}
        />
      );

      // Switch to Custom Input tab
      const customTab = screen.getByText(/Paste Custom Syllabus/i);
      fireEvent.click(customTab);

      // Type custom syllabus
      const textarea = container.querySelector('textarea');
      expect(textarea).toBeTruthy();
      fireEvent.change(textarea!, {
        target: {
          value: '1. Convex Optimization\n2. Dynamic Programming\n3. Transformer Attention Models\n4. Reinforcement Learning\n5. Distributed Systems Consensus',
        },
      });

      const commitCustomBtn = screen.getByText(/Inject 30-Day Syllabus Track/i);
      fireEvent.click(commitCustomBtn);

      await waitFor(() => {
        expect(mockAddHabit).toHaveBeenCalled();
      });

      expect(handleClose).toHaveBeenCalled();
    });
  });
});
