export type PrimaryTrackId = 'placements' | 'competitive_exams' | 'core_coding' | 'fitness';

export interface HabitItem {
  id: string;
  title: string;
  category: 'deep_work' | 'health' | 'mindset' | 'technical';
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'anytime';
  target_count: number;
  isChallengeHabit?: boolean;
}

export interface TrackDrillOption {
  id: string;
  label: string;
  description: string;
}

export interface TrackConfig {
  id: PrimaryTrackId;
  title: string;
  badge: string;
  subtitle: string;
  defaultFocusHours: number;
  allowedHours: number[];
  bottlenecks: TrackDrillOption[];
  anchorHabits: HabitItem[];
}

export interface OnboardingWizardState {
  selectedPrimaryTrack: PrimaryTrackId;
  enableTrack5Challenge: boolean; // Universal Agni Challenge (5 AM – 10 PM)
  dailyFocusHours: number;
  selectedBottleneckId: string;
  customHabits: HabitItem[];
  socialChoice: 'solo' | 'create_squad' | 'join_squad';
  joinSquadCode: string;
}
