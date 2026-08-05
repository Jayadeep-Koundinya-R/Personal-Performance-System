import { useRef } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { Share2, Trophy, Sparkles, Download, Copy } from "lucide-react";
import { toast } from "sonner";

interface ShareWinCardProps {
  streak: number;
  level: number;
  name: string;
}

export default function ShareWinCard({ streak, level, name }: ShareWinCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { limits } = useSubscription();

  const displayName = name || "Performance Master";
  const milestone = streak >= 30 ? "30-Day Legend Streak 🔥" : streak >= 7 ? "7-Day Unbroken Streak 🔥" : `Level ${level} Explorer ⭐`;

  const copyText = async () => {
    const text = `🔥 ${displayName} reached ${milestone} on PPS — Personal Performance System!`;
    await navigator.clipboard.writeText(text);
    toast.success("Copied milestone summary to clipboard!");
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-foreground uppercase font-mono tracking-wider flex items-center gap-2">
            <span>🎴 Milestone Share Card</span>
          </h3>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            Share your habit accomplishments on social media or with friends
          </p>
        </div>

        <button
          onClick={copyText}
          className="text-xs bg-primary text-primary-foreground font-extrabold px-4 py-2 rounded-xl hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Copy Win Summary</span>
        </button>
      </div>

      {/* Card Visual */}
      <div
        ref={cardRef}
        className="rounded-3xl p-7 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 border border-primary/40 text-center relative overflow-hidden text-white shadow-2xl space-y-3"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-4xl mx-auto shadow-lg animate-bounce">
          🏆
        </div>

        <div className="text-2xl font-extrabold text-foreground tracking-tight">{displayName}</div>

        <div className="inline-block bg-pps-orange/20 text-pps-orange border border-pps-orange/40 text-lg font-mono font-extrabold px-4 py-1.5 rounded-full shadow-xs">
          {milestone}
        </div>

        <div className="text-xs text-slate-300 font-mono font-medium pt-2 border-t border-white/10">
          ⚡ Personal Performance System • Jayadeep Koundinya R
        </div>
      </div>
    </div>
  );
}
