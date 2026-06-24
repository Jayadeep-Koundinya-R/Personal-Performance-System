import { useState } from "react";
import { useHabits } from "@/hooks/use-habits";
import { useSubscription } from "@/hooks/use-subscription";
import { useTheme } from "@/hooks/use-theme";

const StreakSection = () => {
  const { habits, getMaxStreak, getTotalFreezeCredits, useStreakFreeze } = useHabits();
  const { toggleTheme } = useTheme();
  const { limits } = useSubscription();
  const [msg, setMsg] = useState<string | null>(null);
  const maxStreak = getMaxStreak();
  const freezeCredits = getTotalFreezeCredits();
  const totalCompletions = habits.reduce((s, h) => s + h.completedDates.length, 0);

  const handleFreeze = async (habitId: string) => {
    const err = await useStreakFreeze(habitId);
    setMsg(err || "Streak shield used! Yesterday saved.");
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div>
      <div className="mb-6"><h1 className="text-[22px] font-bold">Streak Engine</h1><div className="text-[13px] text-muted-foreground mt-0.5">Don't break the chain</div></div>

      {msg && <div className="text-xs px-3 py-2 rounded-lg mb-3 bg-primary/10 text-primary border border-primary/20">{msg}</div>}

      <div className="text-center p-8 bg-gradient-to-br from-[#1e1b4b] to-[#312e81] border border-[#4338ca44] rounded-lg mb-5">
        <div className="text-[32px]">🔥</div>
        <div className="text-5xl font-bold font-mono text-pps-orange">{maxStreak}</div>
        <div className="text-muted-foreground mt-1">Day Streak</div>
        <div className="flex justify-center gap-8 mt-5">
          <div><div className="text-xl font-bold font-mono">{freezeCredits}</div><div className="text-[11px] text-muted-foreground">Freeze Credits</div></div>
          <div><div className="text-xl font-bold font-mono">{maxStreak}</div><div className="text-[11px] text-muted-foreground">Best Streak</div></div>
          <div><div className="text-xl font-bold font-mono">{totalCompletions}</div><div className="text-[11px] text-muted-foreground">Total Completions</div></div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">
          Free: {limits.streakFreezesPerMonth} freeze/month • Pro: 3/month
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {habits.length === 0 ? (
          <p className="text-muted-foreground text-[13px] text-center py-6 col-span-3">No habits yet.</p>
        ) : habits.map((h) => {
          const streak = h.streak || 0;
          const pct = Math.min(streak * 10, 100);
          const color = streak === 0 ? "#ef4444" : streak >= 7 ? "#f97316" : "#6366f1";
          const icon = streak === 0 ? "💀" : "🔥";
          return (
            <div key={h.id} className="bg-card border border-border p-5 rounded-lg">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">{h.name}</div>
              <div className="text-[26px] font-bold font-mono" style={{ color }}>{icon} {streak}</div>
              <div className="text-muted-foreground text-xs mt-1">day streak</div>
              <div className="bg-surface rounded-full h-1.5 mt-2">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}88)` }} />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                <span>{h.category || "—"} • {h.period}</span>
                <span>🧊 {h.freezeCredits} freeze</span>
              </div>
              {h.freezeCredits > 0 && streak > 0 && (
                <button
                  onClick={() => handleFreeze(h.id)}
                  className="mt-3 w-full text-[11px] py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10"
                >
                  🛡 Use Streak Shield
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StreakSection;
