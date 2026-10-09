import { PrimaryTrackId, TrackConfig, HabitItem } from '../types/onboarding';

export const TRACK_5_CHALLENGE = {
  id: 'track_5_agni',
  title: 'Track 5: Agni Circadian Challenge',
  badge: 'Agni Challenge',
  tagline: 'Universal discipline layer: 5:00 AM wake-up, strict evening wind-down, zero excuses.',
  habits: [
    {
      id: 'agni_habit_1',
      title: 'Rise & Hydrate by 5:00 AM',
      category: 'health',
      time_of_day: 'morning',
      target_count: 1,
      isChallengeHabit: true,
    },
    {
      id: 'agni_habit_2',
      title: 'Digital Curfew & Wind-down by 10:00 PM',
      category: 'mindset',
      time_of_day: 'evening',
      target_count: 1,
      isChallengeHabit: true,
    },
  ] as HabitItem[],
};

export const TRACK_PRESETS: Record<PrimaryTrackId, TrackConfig> = {
  placements: {
    id: 'placements',
    title: 'Campus & Tech Placements',
    badge: 'Placements & DSA',
    subtitle: 'Master LeetCode, Core CS fundamentals, and Mock interviews for campus & off-campus hiring.',
    defaultFocusHours: 3,
    allowedHours: [2, 3, 4, 5],
    bottlenecks: [
      {
        id: 'dsa_leetcode',
        label: 'DSA & LeetCode Grinding',
        description: 'Prioritize problem-solving speed, patterns (Trees, DP, Graphs), and timed contest practice.',
      },
      {
        id: 'core_cs_revision',
        label: 'Core CS Revision',
        description: 'Focus heavily on OS, DBMS, Computer Networks, and System Design concepts.',
      },
      {
        id: 'balanced_placement',
        label: 'Balanced Preparation',
        description: 'Split time evenly between coding problems, CS theory revision, and quantitative aptitude.',
      },
    ],
    anchorHabits: [
      {
        id: 'place_h1',
        title: 'Solve 2 DSA / LeetCode Problems',
        category: 'deep_work',
        time_of_day: 'morning',
        target_count: 2,
      },
      {
        id: 'place_h2',
        title: 'Core CS Theory & OS/DBMS Revision',
        category: 'technical',
        time_of_day: 'afternoon',
        target_count: 1,
      },
      {
        id: 'place_h3',
        title: 'Aptitude & Speed Reasoning Practice',
        category: 'technical',
        time_of_day: 'evening',
        target_count: 1,
      },
    ],
  },
  competitive_exams: {
    id: 'competitive_exams',
    title: 'GATE / CAT / UPSC Aspirants',
    badge: 'Competitive Exams',
    subtitle: 'Build high exam stamina, master syllabus coverage, and relentlessly reduce mock test error rates.',
    defaultFocusHours: 4,
    allowedHours: [3, 4, 5, 6],
    bottlenecks: [
      {
        id: 'mcq_speed',
        label: 'MCQ Speed & Mock Exams',
        description: 'Time-bound sectional test sprints with active recall and formula revision.',
      },
      {
        id: 'syllabus_backlog',
        label: 'Syllabus Backlog Clearence',
        description: 'Dedicated high-intensity blocks to clear remaining high-weightage chapters.',
      },
      {
        id: 'error_log_analysis',
        label: 'Error Log & Weakness Analysis',
        description: 'Detailed analysis of incorrect mock answers and targeted concept re-learning.',
      },
    ],
    anchorHabits: [
      {
        id: 'exam_h1',
        title: 'Daily MCQ Sprint / Timed Mock Test',
        category: 'deep_work',
        time_of_day: 'morning',
        target_count: 1,
      },
      {
        id: 'exam_h2',
        title: 'Syllabus Backlog Deep Work Session',
        category: 'technical',
        time_of_day: 'afternoon',
        target_count: 1,
      },
      {
        id: 'exam_h3',
        title: 'Error Log Review & Mistake Journaling',
        category: 'mindset',
        time_of_day: 'evening',
        target_count: 1,
      },
    ],
  },
  core_coding: {
    id: 'core_coding',
    title: 'Indie SaaS & Systems Engineering',
    badge: 'Core Engineering',
    subtitle: 'Ship real-world projects, build robust distributed systems, and maintain active GitHub streak momentum.',
    defaultFocusHours: 3,
    allowedHours: [2, 3, 4, 5],
    bottlenecks: [
      {
        id: 'feature_delivery',
        label: 'Feature Delivery & Shipping',
        description: 'Focus on production code, API endpoints, and user-facing feature momentum.',
      },
      {
        id: 'system_design_prs',
        label: 'System Design & Code Reviews',
        description: 'Focus on architecture design specs, PR reviews, database schemas, and refactoring.',
      },
      {
        id: 'open_source_git',
        label: 'Open Source & Git Consistency',
        description: 'Maintain daily commit cadence, open-source contributions, and clean documentation.',
      },
    ],
    anchorHabits: [
      {
        id: 'code_h1',
        title: 'Push 1 Production Git Commit',
        category: 'technical',
        time_of_day: 'morning',
        target_count: 1,
      },
      {
        id: 'code_h2',
        title: 'Deep Focus Feature Delivery Block',
        category: 'deep_work',
        time_of_day: 'afternoon',
        target_count: 1,
      },
      {
        id: 'code_h3',
        title: 'System Design Architecture & PR Review',
        category: 'technical',
        time_of_day: 'evening',
        target_count: 1,
      },
    ],
  },
  fitness: {
    id: 'fitness',
    title: 'High Energy & Health',
    badge: 'Fitness & Vitality',
    subtitle: 'Maximize physical performance, optimize daily nutrition, and enforce ironclad circadian sleep recovery.',
    defaultFocusHours: 2,
    allowedHours: [1, 2, 3, 4],
    bottlenecks: [
      {
        id: 'strength_workout',
        label: 'Strength & Workout Consistency',
        description: 'Structured weight training, cardio conditioning, and daily physical movement.',
      },
      {
        id: 'nutrition_hydration',
        label: 'Nutrition & Protein Tracking',
        description: 'Consistent protein intake targets, meal prep, and 3L daily hydration.',
      },
      {
        id: 'recovery_sleep',
        label: 'Sleep Recovery & Evening Curfew',
        description: 'Strict nighttime routine, zero screen-time before bed, and 8 hours of sleep.',
      },
    ],
    anchorHabits: [
      {
        id: 'fit_h1',
        title: '45-Min Workout or Active Movement',
        category: 'health',
        time_of_day: 'morning',
        target_count: 1,
      },
      {
        id: 'fit_h2',
        title: 'Hit Hydration (3L) & Protein Goal',
        category: 'health',
        time_of_day: 'anytime',
        target_count: 1,
      },
      {
        id: 'fit_h3',
        title: 'Screen-Free Sleep Recovery Curfew',
        category: 'health',
        time_of_day: 'evening',
        target_count: 1,
      },
    ],
  },
};
