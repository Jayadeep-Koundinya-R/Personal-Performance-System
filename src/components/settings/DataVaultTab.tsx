import React, { useState } from "react";
import { motion } from "framer-motion";
import { Download, Upload, Trash2, HelpCircle } from "lucide-react";
import { Habit } from "@/hooks/use-habits";
import { ReflectionEntry } from "@/hooks/use-reflections";
import { exportToCSV, exportToJSON, parseAndValidateBackup } from "@/lib/dataExport";
import { toast } from "sonner";

interface DataVaultTabProps {
  habits: Habit[];
  reflections: ReflectionEntry[];
  onResetOnboarding: () => void;
  onResetAllData: () => Promise<void>;
  onRestoreHabit: (name: string, category: string, frequency: string, priority: string) => Promise<any>;
}

export const DataVaultTab: React.FC<DataVaultTabProps> = ({
  habits,
  reflections,
  onResetOnboarding,
  onResetAllData,
  onRestoreHabit,
}) => {
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("json");

  const exportData = () => {
    if (exportFormat === "csv") {
      exportToCSV(habits);
      toast.success("CSV export downloaded! 📊");
    } else {
      exportToJSON(habits, reflections);
      toast.success("JSON backup downloaded! 💾");
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const validation = parseAndValidateBackup(text);

        if (!validation.valid) {
          toast.error("Invalid backup file format.");
          return;
        }

        const rawData = JSON.parse(text);
        const importedHabits = rawData.habits || [];

        let count = 0;
        for (const h of importedHabits) {
          const exists = habits.some((existing) => existing.name.toLowerCase() === h.name.toLowerCase());
          if (!exists) {
            await onRestoreHabit(h.name, h.category || "General", h.frequency || "daily", h.priority || "medium");
            count++;
          }
        }

        toast.success(`Successfully restored ${count} new habits from backup! 🎉`);
      } catch (err) {
        console.error("Failed to parse backup:", err);
        toast.error("Failed to parse the backup JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div
      key="datavault"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-5"
    >
      <div className="bg-card border border-border p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
            <Download className="w-4 h-4 text-pps-green" />
            <span>Data Vault, Portability & Backups</span>
          </h3>
        </div>

        <div className="space-y-4">
          {/* Export Card */}
          <div className="p-4 bg-surface/60 border border-border/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs font-extrabold text-foreground">Export Complete Workspace Data</div>
                <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  Download your full habits catalog, completion logs, streaks, and reflections journal
                </div>
              </div>

              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as "csv" | "json")}
                className="bg-surface border border-border/80 text-xs font-mono font-bold rounded-xl px-3 py-1.5 outline-none text-foreground cursor-pointer"
              >
                <option value="json">JSON Structured Backup</option>
                <option value="csv">CSV Spreadsheet Format</option>
              </select>
            </div>

            <button
              onClick={exportData}
              className="w-full text-xs bg-primary text-primary-foreground font-extrabold py-2.5 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
            >
              Download Data Snapshot ({exportFormat.toUpperCase()})
            </button>
          </div>

          {/* Import / Restore Card */}
          <div className="p-4 bg-surface/60 border border-border/80 rounded-2xl flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs font-extrabold text-foreground">Restore Data from JSON Backup</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Import missing habits, streak milestones, and reflection entries with dry-run validation
              </div>
            </div>

            <label className="text-xs bg-surface border border-border/80 text-foreground font-extrabold px-4 py-2 rounded-xl hover:bg-muted/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs">
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span>Choose JSON Backup</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>

          {/* Replay Guide */}
          <div className="p-4 bg-surface/60 border border-border/80 rounded-2xl flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs font-extrabold text-foreground">Replay Interactive Onboarding Tour</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Relaunch the interactive 7-step guided walk-through of the dashboard features
              </div>
            </div>

            <button
              onClick={() => {
                onResetOnboarding();
                toast.success("Onboarding tour re-enabled. Refresh or navigate to Today tab to begin.");
              }}
              className="text-xs bg-surface border border-border/80 text-foreground font-extrabold px-4 py-2 rounded-xl hover:bg-muted/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <HelpCircle className="w-3.5 h-3.5 text-primary" />
              <span>Restart Tour</span>
            </button>
          </div>

          {/* Danger Zone: Reset Data */}
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs font-extrabold text-destructive">Danger Zone: Reset All Workspace Data</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Permanently purge all habits, completion history, XP, and journal entries
              </div>
            </div>

            <button
              onClick={async () => {
                if (window.confirm("⚠️ WARNING: Are you sure you want to delete all habits and data? This cannot be undone.")) {
                  await onResetAllData();
                  toast.success("Workspace reset to initial clean state.");
                }
              }}
              className="text-xs bg-destructive text-destructive-foreground font-extrabold px-4 py-2 rounded-xl hover:bg-destructive/90 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge All Data</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
