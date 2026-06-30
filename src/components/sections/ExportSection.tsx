import { useState } from "react";
import { useAuth, User } from "@/hooks/use-auth";
import { useHabits, Habit } from "@/hooks/use-habits";
import { useReflections, ReflectionEntry } from "@/hooks/use-reflections";
import { useUserSettings } from "@/hooks/use-user-settings";
import { exportToCSV, exportToJSON, exportReflectionsToCSV, prepareFullExport } from "@/lib/dataExport";
import { toast } from "sonner";

interface ExportSectionProps {
  user: User;
}

interface GuestData {
  habits: Habit[];
  reflections: ReflectionEntry[];
  settings: Record<string, unknown> | null;
}

const ExportSection = ({ user }: ExportSectionProps) => {
  const { habits } = useHabits();
  const { entries: reflections } = useReflections();
  const { settings } = useUserSettings();
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("json");
  const [isExporting, setIsExporting] = useState(false);

  // Load guest data from localStorage
  const loadGuestData = (): GuestData => {
    let guestHabits: Habit[] = [];
    let guestReflections: ReflectionEntry[] = [];
    let guestSettings: Record<string, unknown> | null = null;

    try {
      const habitsRaw = localStorage.getItem("habits_guest");
      if (habitsRaw) {
        guestHabits = JSON.parse(habitsRaw);
      }
    } catch (e) {
      console.error("Failed to parse guest habits:", e);
    }

    try {
      const reflectionsRaw = localStorage.getItem("reflections_guest");
      if (reflectionsRaw) {
        guestReflections = JSON.parse(reflectionsRaw);
      }
    } catch (e) {
      console.error("Failed to parse guest reflections:", e);
    }

    try {
      const settingsRaw = localStorage.getItem("settings_guest");
      if (settingsRaw) {
        guestSettings = JSON.parse(settingsRaw);
      }
    } catch (e) {
      console.error("Failed to parse guest settings:", e);
    }

    return {
      habits: guestHabits,
      reflections: guestReflections,
      settings: guestSettings,
    };
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Get data based on user mode
      const exportHabits = user.isGuest ? loadGuestData().habits : habits;
      const exportReflections = user.isGuest ? loadGuestData().reflections : reflections;
      const exportSettings = user.isGuest ? loadGuestData().settings : settings;

      if (exportHabits.length === 0 && exportReflections.length === 0) {
        toast.error("No data to export. Start by adding some habits or reflections!");
        setIsExporting(false);
        return;
      }

      if (exportFormat === "csv") {
        exportToCSV(exportHabits);
        if (exportReflections.length > 0) {
          exportReflectionsToCSV(exportReflections);
        }
        toast.success("Data exported to CSV successfully!");
      } else {
        const fullData = {
          habits: exportHabits,
          reflections: exportReflections,
          settings: exportSettings,
          exportDate: new Date().toISOString(),
          version: "1.0.0",
        };
        exportToJSON(fullData);
        toast.success("Data exported to JSON successfully!");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const inputClass = "bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold">Export Data</h1>
        <div className="text-[13px] text-muted-foreground mt-0.5">
          Download your habits, reflections, and settings
        </div>
      </div>

      {user.isGuest && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs px-3 py-2.5 rounded-lg mb-5">
          You are in guest mode. Data will be exported from localStorage.
        </div>
      )}

      <div className="bg-card border border-border p-5 rounded-lg max-w-lg">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Export Options
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <div className="text-sm font-medium">Export Format</div>
              <div className="text-xs text-muted-foreground mt-0.5">Choose file format</div>
            </div>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as "csv" | "json")}
              className="bg-surface border border-border px-3 py-1.5 rounded-lg text-sm outline-none focus:border-primary"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div className="py-3 border-b border-border">
            <div className="text-sm font-medium mb-3">Data Included</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>✓</span> Habits
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>✓</span> Completions
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>✓</span> Reflections
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>✓</span> Settings
              </div>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? "Exporting..." : "Export Data"}
          </button>
        </div>
      </div>

      <div className="mt-6 bg-card border border-border p-5 rounded-lg max-w-lg">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          About Export
        </h3>
        <div className="text-[13px] text-muted-foreground space-y-2">
          <p>
            <strong>JSON</strong> - Complete backup including habits, completions, reflections, and settings. Best for full backup or migrating data.
          </p>
          <p>
            <strong>CSV</strong> - Spreadsheet-friendly format. Exports habits and reflections as separate CSV files.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExportSection;