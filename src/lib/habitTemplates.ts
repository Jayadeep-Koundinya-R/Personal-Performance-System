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
      { name: "Morning meditation", category: "Mindfulness", period: "Daily", priority: "High" },
      { name: "Morning stretch/workout", category: "Health", period: "Daily", priority: "High" },
      { name: "Journaling", category: "Personal Growth", period: "Daily", priority: "Medium" },
      { name: "Healthy breakfast", category: "Health", period: "Daily", priority: "Medium" },
    ],
  },
  {
    id: "student-study",
    name: "Student Study Habits",
    description: "Ace your exams and build academic consistency",
    icon: "🎓",
    habits: [
      { name: "Review lecture notes", category: "Learning", period: "Daily", priority: "High" },
      { name: "1 hour study block", category: "Learning", period: "Daily", priority: "High" },
      { name: "Read textbook 20 mins", category: "Learning", period: "Daily", priority: "Medium" },
      { name: "Weekly study review", category: "Learning", period: "Weekly", priority: "Medium" },
    ],
  },
  {
    id: "fitness-starter",
    name: "Fitness Starter",
    description: "Build a consistent exercise routine",
    icon: "💪",
    habits: [
      { name: "30 min movement", category: "Health", period: "Daily", priority: "High" },
      { name: "Strength training", category: "Health", period: "Weekly", priority: "High" },
      { name: "Drink 8 glasses of water", category: "Health", period: "Daily", priority: "Medium" },
      { name: "Post-workout stretching", category: "Health", period: "Daily", priority: "Low" },
    ],
  },
  {
    id: "developer-productivity",
    name: "Developer Productivity",
    description: "Optimize coding workflow and engineering standards",
    icon: "💻",
    habits: [
      { name: "Deep work coding (2 hours)", category: "Productivity", period: "Daily", priority: "High" },
      { name: "Review a pull request", category: "Productivity", period: "Daily", priority: "Medium" },
      { name: "Refactor one function", category: "Productivity", period: "Daily", priority: "Medium" },
      { name: "Update documentation", category: "Productivity", period: "Weekly", priority: "Low" },
    ],
  },
  {
    id: "mindfulness",
    name: "Mindfulness Practice",
    description: "Cultivate mental clarity and peace",
    icon: "🧘",
    habits: [
      { name: "Mindful breathing (10m)", category: "Wellness", period: "Daily", priority: "High" },
      { name: "Gratitude journal", category: "Personal Growth", period: "Daily", priority: "Medium" },
      { name: "Digital detox (1 hour)", category: "Wellness", period: "Daily", priority: "Medium" },
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
