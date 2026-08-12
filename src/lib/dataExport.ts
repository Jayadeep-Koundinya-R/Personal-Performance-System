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

export function parseAndValidateBackup(jsonString: string): { success: boolean; data?: ExportData; error?: string } {
  try {
    if (!jsonString || typeof jsonString !== "string") {
      return { success: false, error: "Empty or invalid backup data." };
    }

    const parsed = JSON.parse(jsonString);

    if (typeof parsed !== "object" || parsed === null) {
      return { success: false, error: "Invalid backup format: root must be a JSON object." };
    }

    // Check if habits array or reflections array exists
    const habits = Array.isArray(parsed.habits) ? parsed.habits : [];
    const reflections = Array.isArray(parsed.reflections) ? parsed.reflections : [];

    if (habits.length === 0 && reflections.length === 0) {
      return { success: false, error: "Backup file contains no habits or reflections data." };
    }

    // Validate habits structures
    for (const h of habits) {
      if (!h.name || typeof h.name !== "string") {
        return { success: false, error: "Corrupted habit entry: missing name string." };
      }
    }

    return {
      success: true,
      data: {
        habits: habits.map((h: any) => ({
          id: h.id || String(Date.now() + Math.random()),
          name: h.name,
          category: h.category || "General",
          priority: h.priority || "Medium",
          period: h.period || "Daily",
          dueDate: h.dueDate || new Date().toISOString(),
          completedDates: Array.isArray(h.completedDates) ? h.completedDates : [],
          streak: typeof h.streak === "number" ? h.streak : 0,
          lastCompletedDate: h.lastCompletedDate || null,
          freezeCredits: typeof h.freezeCredits === "number" ? h.freezeCredits : 2,
          startTime: h.startTime || null,
          endTime: h.endTime || null,
          color: h.color || "indigo",
          archived: !!h.archived,
        })),
        reflections: reflections.map((r: any) => ({
          id: r.id || String(Date.now() + Math.random()),
          date: r.date || new Date().toISOString().split("T")[0],
          text: r.text || "",
          mood: r.mood || "great",
          habitsLog: Array.isArray(r.habitsLog) ? r.habitsLog : [],
        })),
        exportDate: parsed.exportDate || new Date().toISOString(),
        version: parsed.version || "1.0.0",
      },
    };
  } catch (err: any) {
    return { success: false, error: `JSON Parse Error: ${err?.message || "Invalid JSON formatting."}` };
  }
}
