export interface HabitTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  habits: Array<{
    name: string;
    category: string;
    period: string;
    priority: string;
  }>;
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  {
    id: "morning-routine",
    name: "Morning Routine",
    description: "Start your day with intention and energy",
    icon: "🌅",
    habits: [
      { name: "Meditation", category: "Wellness", period: "Daily", priority: "High" },
      { name: "Exercise", category: "Health", period: "Daily", priority: "High" },
      { name: "Journaling", category: "Personal Growth", period: "Daily", priority: "Medium" },
      { name: "Read for 30 minutes", category: "Learning", period: "Daily", priority: "Medium" },
    ],
  },
  {
    id: "fitness-starter",
    name: "Fitness Starter",
    description: "Build a consistent exercise habit",
    icon: "💪",
    habits: [
      { name: "30 min cardio", category: "Health", period: "Daily", priority: "High" },
      { name: "Strength training", category: "Health", period: "Weekly", priority: "High" },
      { name: "Stretching", category: "Health", period: "Daily", priority: "Medium" },
      { name: "Drink 8 glasses of water", category: "Health", period: "Daily", priority: "Medium" },
    ],
  },
  {
    id: "productivity-boost",
    name: "Productivity Boost",
    description: "Maximize your daily output",
    icon: "🚀",
    habits: [
      { name: "Plan tomorrow today", category: "Productivity", period: "Daily", priority: "High" },
      { name: "Deep work block (2 hours)", category: "Work", period: "Daily", priority: "High" },
      { name: "Review weekly goals", category: "Productivity", period: "Weekly", priority: "Medium" },
      { name: "Clear inbox", category: "Work", period: "Daily", priority: "Low" },
    ],
  },
  {
    id: "mindfulness",
    name: "Mindfulness Practice",
    description: "Cultivate mental clarity and peace",
    icon: "🧘",
    habits: [
      { name: "Morning meditation", category: "Wellness", period: "Daily", priority: "High" },
      { name: "Gratitude journal", category: "Personal Growth", period: "Daily", priority: "Medium" },
      { name: "Digital detox (1 hour)", category: "Wellness", period: "Daily", priority: "Medium" },
      { name: "Evening reflection", category: "Personal Growth", period: "Daily", priority: "Low" },
    ],
  },
  {
    id: "learning",
    name: "Learning Journey",
    description: "Consistent skill development",
    icon: "📚",
    habits: [
      { name: "Read for 30 minutes", category: "Learning", period: "Daily", priority: "High" },
      { name: "Online course (30 min)", category: "Learning", period: "Daily", priority: "High" },
      { name: "Practice new skill", category: "Learning", period: "Daily", priority: "Medium" },
      { name: "Watch educational content", category: "Learning", period: "Weekly", priority: "Low" },
    ],
  },
  {
    id: "health-basics",
    name: "Health Basics",
    description: "Foundation for physical wellbeing",
    icon: "❤️",
    habits: [
      { name: "Sleep 8 hours", category: "Health", period: "Daily", priority: "High" },
      { name: "Eat vegetables", category: "Health", period: "Daily", priority: "High" },
      { name: "Take vitamins", category: "Health", period: "Daily", priority: "Medium" },
      { name: "Limit sugar intake", category: "Health", period: "Daily", priority: "Medium" },
    ],
  },
];

export function getTemplateById(id: string): HabitTemplate | undefined {
  return HABIT_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): HabitTemplate[] {
  return HABIT_TEMPLATES.filter((t) =>
    t.habits.some((h) => h.category === category)
  );
}
