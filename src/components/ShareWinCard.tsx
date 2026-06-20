import { useRef } from "react";
import { useSubscription } from "@/hooks/use-subscription";

interface ShareWinCardProps {
  streak: number;
  level: number;
  name: string;
}

export default function ShareWinCard({ streak, level, name }: ShareWinCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { limits } = useSubscription();

  if (streak < 7 && level < 5) return null;

  const milestone = streak >= 30 ? "30-Day Streak" : streak >= 7 ? "7-Day Streak" : `Level ${level}`;

  const download = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm")).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: "#0f0f14", scale: 2 });
      const link = document.createElement("a");
      link.download = `pps-${milestone.replace(/\s/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      const text = `🔥 ${name} hit ${milestone} on PPS — Personal Performance System!`;
      await navigator.clipboard.writeText(text);
      alert("Copied share text to clipboard!");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Share Your Win</h3>
        <button onClick={download} className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-lg">
          Export Card
        </button>
      </div>
      <div ref={cardRef} className="rounded-xl p-6 bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-center relative overflow-hidden">
        {limits.shareCardsWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-4xl font-bold rotate-[-20deg]">
            PPS FREE
          </div>
        )}
        <div className="text-4xl mb-2">🏆</div>
        <div className="text-xl font-bold">{name}</div>
        <div className="text-3xl font-mono font-bold text-pps-orange mt-2">{milestone}</div>
        <div className="text-[11px] text-muted-foreground mt-3 font-mono">PPS — Personal Performance System</div>
      </div>
      {limits.shareCardsWatermark && (
        <p className="text-[11px] text-muted-foreground mt-2">Pro removes watermark from share cards.</p>
      )}
    </div>
  );
}
