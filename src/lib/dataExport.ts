import { Habit } from "@/hooks/use-habits";
import { ReflectionEntry } from "@/hooks/use-reflections";

export interface ExportData {
  habits: Habit[];
  reflections: ReflectionEntry[];
  exportDate: string;
  version: string;
}

export function exportToCSV(habits: Habit[]) {
  const headers = ["Name", "Category", "Priority", "Period", "Due Date", "Streak", "Total Completions", "Freeze Credits"];
  const rows = habits.map((h) => [
    h.name,
    h.category,
    h.priority,
    h.period,
    h.dueDate,
    h.streak,
    h.completedDates.length,
    h.freezeCredits,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  downloadFile(csvContent, "pps_habits_export.csv", "text/csv");
}

export function exportToJSON(data: ExportData) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, "pps_data_export.json", "application/json");
}

export function exportReflectionsToCSV(reflections: ReflectionEntry[]) {
  const headers = ["Date", "Mood", "Content", "Habits Log"];
  const rows = reflections.map((r) => [
    r.date,
    r.mood,
    r.text.replace(/"/g, '""'),
    JSON.stringify(r.habitsLog),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  downloadFile(csvContent, "pps_reflections_export.csv", "text/csv");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function prepareFullExport(habits: Habit[], reflections: ReflectionEntry[]): ExportData {
  return {
    habits,
    reflections,
    exportDate: new Date().toISOString(),
    version: "1.0.0",
  };
}
