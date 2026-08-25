import React from "react";
import { motion } from "framer-motion";
import { Bell, Volume2, Shield } from "lucide-react";
import { UserSettings } from "@/hooks/use-user-settings";

interface AutomationTabProps {
  settings: UserSettings | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<any>;
  onTestAlarmTone: () => void;
}

export const AutomationTab: React.FC<AutomationTabProps> = ({
  settings,
  updateSettings,
  onTestAlarmTone,
}) => {
  return (
    <motion.div
      key="automation"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-5"
    >
      <div className="bg-card border border-border p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-400" />
            <span>Circadian Alerts & Automated Shield Preferences</span>
          </h3>
          <button
            onClick={onTestAlarmTone}
            className="text-xs bg-surface border border-border/80 text-foreground px-3 py-1.5 rounded-xl font-bold hover:bg-muted/40 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Volume2 className="w-3.5 h-3.5 text-primary" />
            <span>Test Tone 🔊</span>
          </button>
        </div>

        <div className="space-y-3">
          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 bg-surface/60 border border-border/80 rounded-2xl">
            <div>
              <div className="text-xs font-extrabold text-foreground">Email Notifications & Digest</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Receive circadian morning briefings and weekly executive report digests
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                updateSettings({
                  notificationPrefs: {
                    email: !settings?.notificationPrefs?.email,
                    push: !!settings?.notificationPrefs?.push,
                  },
                })
              }
              className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${
                settings?.notificationPrefs?.email ? "bg-primary" : "bg-border"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                  settings?.notificationPrefs?.email ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* In-App Bell */}
          <div className="flex items-center justify-between p-4 bg-surface/60 border border-border/80 rounded-2xl">
            <div>
              <div className="text-xs font-extrabold text-foreground">In-App Notification Bell</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Display real-time habit alarms and streak milestone achievements
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                updateSettings({
                  notificationPrefs: {
                    email: !!settings?.notificationPrefs?.email,
                    push: !settings?.notificationPrefs?.push,
                  },
                })
              }
              className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${
                settings?.notificationPrefs?.push ? "bg-primary" : "bg-border"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                  settings?.notificationPrefs?.push ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Auto Streak Shield */}
          <div className="flex items-center justify-between p-4 bg-surface/60 border border-border/80 rounded-2xl">
            <div>
              <div className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-pps-green" />
                <span>Automatic Streak Shield Freeze Protection</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Automatically consume available freeze credits when a circadian habit window is missed to preserve streaks
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                updateSettings({
                  autoStreakFreeze: !settings?.autoStreakFreeze,
                })
              }
              className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${
                settings?.autoStreakFreeze ? "bg-primary" : "bg-border"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                  settings?.autoStreakFreeze ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
