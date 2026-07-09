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

      <div className="text-center p-8 bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent border border-primary/15 rounded-xl mb-5 shadow-sm">
        <div className="text-[32px] animate-bounce">🔥</div>
        <div className="text-5xl font-bold font-mono text-pps-orange mt-1">{maxStreak}</div>
        <div className="text-foreground/80 mt-1 text-sm font-medium">Day Streak</div>
        <div className="flex justify-center gap-8 mt-6 border-t border-border/60 pt-5">
          <div><div className="text-xl font-bold font-mono text-foreground">{freezeCredits}</div><div className="text-[11px] text-muted-foreground mt-0.5">Freeze Credits</div></div>
          <div><div className="text-xl font-bold font-mono text-foreground">{maxStreak}</div><div className="text-[11px] text-muted-foreground mt-0.5">Best Streak</div></div>
          <div><div className="text-xl font-bold font-mono text-foreground">{totalCompletions}</div><div className="text-[11px] text-muted-foreground mt-0.5">Total Completions</div></div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-4 font-mono">
          Free: {limits.streakFreezesPerMonth} freeze/month • Pro: 3/month
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {habits.filter(h => !h.archived).length === 0 ? (
          <p className="text-muted-foreground text-[13px] text-center py-6 col-span-3">No habits yet.</p>
        ) : habits.filter(h => !h.archived).map((h) => {
          const streak = h.streak || 0;
          const pct = Math.min(streak * 10, 100);
          const isZero = streak === 0;
          const isHigh = streak >= 7;
          
          const hslColor = isZero 
            ? "hsl(var(--destructive))" 
            : isHigh 
            ? "hsl(var(--orange))" 
            : "hsl(var(--primary))";
          
          const hslColorLow = isZero 
            ? "hsl(var(--destructive) / 0.3)" 
            : isHigh 
            ? "hsl(var(--orange) / 0.3)" 
            : "hsl(var(--primary) / 0.3)";
            
          const icon = isZero ? "💀" : "🔥";
          return (
            <div key={h.id} className="bg-card border border-border p-5 rounded-xl hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{h.name}</div>
              <div className="text-[26px] font-bold font-mono" style={{ color: hslColor }}>{icon} {streak}</div>
              <div className="text-muted-foreground text-xs mt-0.5">day streak</div>
              <div className="bg-surface rounded-full h-1.5 mt-3">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${hslColor}, ${hslColorLow})` }} />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground mt-2 pt-1">
                <span>{h.category || "—"} • {h.period}</span>
                <span>🧊 {h.freezeCredits} freeze</span>
              </div>
              {h.freezeCredits > 0 && streak > 0 && (
                <button
                  onClick={() => handleFreeze(h.id)}
                  className="mt-3 w-full text-[11px] py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-all duration-200"
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
