import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Sparkles,
  Zap,
  Lock,
  Crown,
  ChevronRight,
  Send,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  ArrowRight,
  Shield,
  Layers,
  Copy,
  Check,
  Compass,
} from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { feedbackSounds } from "@/lib/audio/clickFeedback";
import { toast } from "sonner";
import { dispatchCoachMessage, ChatMessage } from "@/lib/ai/aiChatService";

interface Props {
  habits: any[];
  todayFocusMinutes: number;
  targetFocusMinutes: number;
  completionRate: number;
  maxStreak: number;
  primaryTrack?: string | null;
  onStartSprint?: (taskName: string, durationMinutes: number) => void;
  onNavigate?: (section: string) => void;
}

export const ProAiPerformanceAgentBox: React.FC<Props> = ({
  habits,
  todayFocusMinutes,
  targetFocusMinutes,
  completionRate,
  maxStreak,
  primaryTrack = "placements",
  onStartSprint,
  onNavigate,
}) => {
  const { isPro: subIsPro, refresh: refreshSub } = useSubscription();
  const { user } = useAuth();

  // Local testing override for Pro status
  const [localProOverride, setLocalProOverride] = useState<boolean>(() => {
    try {
      return localStorage.getItem("pps_plan") === "pro";
    } catch {
      return false;
    }
  });

  const isPro = subIsPro || localProOverride;

  const [activeTab, setActiveTab] = useState<"analysis" | "chat">("analysis");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string; time: string }>>([
    {
      sender: "ai",
      text: `Hello! I am your Pro Cognitive Performance Copilot. I've audited your active track (${primaryTrack.replace("_", " ")}). Ready to accelerate your deep work velocity?`,
      time: "Just now",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // Unlock Pro Trial (Instant Sandbox Toggle)
  const handleToggleProSandbox = () => {
    feedbackSounds.playStreakMilestone();
    const next = !localProOverride;
    setLocalProOverride(next);
    try {
      localStorage.setItem("pps_plan", next ? "pro" : "free");
    } catch {}
    if (next) {
      toast.success("👑 Student Pro Sandbox Activated!", {
        description: "All Pro AI Cognitive Copilot features unlocked.",
      });
    } else {
      toast.info("Switched to Free Tier Preview mode.");
    }
    refreshSub();
  };

  // ── Intelligent Analysis Engine ──
  const uncompleted = useMemo(() => habits.filter((h) => !(h.completedDates || []).includes(new Date().toISOString().split("T")[0])), [habits]);
  const highPriority = useMemo(() => uncompleted.filter((h) => h.priority === "High" || h.priority === "Critical"), [uncompleted]);

  const velocityScore = useMemo(() => {
    const habitScore = completionRate * 0.45;
    const focusRatio = targetFocusMinutes > 0 ? Math.min(100, (todayFocusMinutes / targetFocusMinutes) * 100) : 0;
    const focusScore = focusRatio * 0.35;
    const streakBonus = Math.min(20, maxStreak * 2);
    return Math.round(habitScore + focusScore + streakBonus);
  }, [completionRate, todayFocusMinutes, targetFocusMinutes, maxStreak]);

  const bottleneckHabit = useMemo(() => {
    if (highPriority.length > 0) return highPriority[0];
    if (uncompleted.length > 0) return uncompleted[0];
    return null;
  }, [highPriority, uncompleted]);

  const energyStatus = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return { label: "Morning Peak Alertness", color: "text-emerald-400", desc: "Cortisol prime window. Highest cognitive bandwidth." };
    if (h >= 11 && h < 14) return { label: "High Sustained Focus", color: "text-cyan-400", desc: "Optimal for analytical problem solving and coding." };
    if (h >= 14 && h < 17) return { label: "Post-Prandial Dip", color: "text-amber-400", desc: "Mild fatigue window. Prefer 15m micro-sprints over heavy blocks." };
    if (h >= 17 && h < 22) return { label: "Second Wind Focus", color: "text-purple-400", desc: "Creativity & synthesis peak. Ideal for review and reflection." };
    return { label: "Late Night Wind-Down", color: "text-rose-400", desc: "Dim cognitive glare. Prepare for sleep hygiene." };
  }, []);

  const handleSendQuery = useCallback(async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isThinking) return;

    feedbackSounds.playClick();
    const userMsg = { sender: "user" as const, text: q, time: "Now" };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsThinking(true);

    try {
      // Build contextual prompt for the coach
      const response = await dispatchCoachMessage({
        message: q,
        userId: user?.id,
        isPro: true,
        context: {
          habits,
          todayFocusMinutes,
          targetFocusMinutes,
          completionRate,
          maxStreak,
          primaryTrack,
          bottleneck: bottleneckHabit?.name || "None",
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: response.reply,
          time: "Now",
        },
      ]);
    } catch {
      // Graceful local intelligence fallback
      setTimeout(() => {
        let fallbackReply = `Based on your telemetry (${completionRate}% completed, ${todayFocusMinutes}m deep work): `;
        if (q.toLowerCase().includes("audit") || q.toLowerCase().includes("momentum")) {
          fallbackReply += `Your Velocity Score is ${velocityScore}/100. You are performing within ${energyStatus.label}. Recommended: execute a 25m sprint for "${bottleneckHabit?.name || "your primary target"}" to lock in today's momentum.`;
        } else if (q.toLowerCase().includes("bottleneck") || q.toLowerCase().includes("stuck")) {
          fallbackReply += `Detected friction on "${bottleneckHabit?.name || "current queue"}". Rule: Don't fight fatigue with brute force. Use the 2-Minute Micro-Habit ladder or slice the task into a 15m sprint.`;
        } else {
          fallbackReply += `Focus on 1 non-negotiable anchor habit. Launch a 25m sprint right now, turn off notifications, and your cognitive inertia will dissolve within 4 minutes.`;
        }
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: fallbackReply,
            time: "Now",
          },
        ]);
        setIsThinking(false);
      }, 500);
      return;
    } finally {
      setIsThinking(false);
    }
  }, [inputQuery, isThinking, user?.id, habits, todayFocusMinutes, targetFocusMinutes, completionRate, maxStreak, primaryTrack, bottleneckHabit, velocityScore, energyStatus]);

  // Global listener for proactive AI Copilot open events
  useEffect(() => {
    const handleOpenAi = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setActiveTab("chat");
      if (detail.prompt) {
        handleSendQuery(detail.prompt);
      }
    };
    window.addEventListener("pps_open_ai_copilot", handleOpenAi);
    return () => window.removeEventListener("pps_open_ai_copilot", handleOpenAi);
  }, [handleSendQuery]);

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div id="pro-ai-copilot-box" className="relative rounded-3xl overflow-hidden border border-primary/40 bg-gradient-to-br from-card/95 via-surface/80 to-card/95 backdrop-blur-xl shadow-2xl transition-all">
      {/* ── Top Ambient Edge Glow ── */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-cyan-400 to-amber-400 opacity-80" />

      {/* ── Header Bar ── */}
      <div className="p-4 sm:p-5 border-b border-border/70 flex items-center justify-between gap-3 flex-wrap bg-surface/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary/30 relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black font-mono tracking-tight text-foreground flex items-center gap-1.5">
                <span>PPS Pro Cognitive Agent</span>
                <span className="text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <Crown className="w-3 h-3 fill-current" /> PRO
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              Dual-Engine Intelligence • Gemini 2.0 Pro & Local Cognitive Pipeline
            </p>
          </div>
        </div>

        {/* Mode Tabs & Tester Toggle */}
        <div className="flex items-center gap-2">
          {/* Test Sandbox Toggle */}
          <button
            type="button"
            onClick={handleToggleProSandbox}
            className="text-[10px] font-mono px-2 py-1 rounded-xl bg-surface hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center gap-1"
            title="Tester Tool: Toggle Pro vs Free View"
          >
            <span>{isPro ? "🔓 Pro Unlocked" : "🔒 Free Mode"}</span>
            <span className="text-primary font-bold">(Toggle)</span>
          </button>

          {isPro && (
            <div className="flex items-center gap-1 bg-surface border border-border/80 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  feedbackSounds.playClick();
                  setActiveTab("analysis");
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === "analysis"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📊 Live Audit
              </button>
              <button
                type="button"
                onClick={() => {
                  feedbackSounds.playClick();
                  setActiveTab("chat");
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === "chat"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>💬 Quick Chat</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Content Area: Gated View vs Active Pro Features ── */}
      {!isPro ? (
        /* ═══════════ PRO-GATED PREVIEW SCREEN ═══════════ */
        <div className="p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
          {/* Blurred Background Teaser */}
          <div className="absolute inset-0 opacity-15 filter blur-sm pointer-events-none p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="h-20 bg-primary/30 rounded-2xl" />
              <div className="h-20 bg-cyan-500/30 rounded-2xl" />
              <div className="h-20 bg-amber-500/30 rounded-2xl" />
            </div>
            <div className="h-32 bg-card rounded-2xl" />
          </div>

          <div className="relative z-10 max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-500 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-amber-500/10">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-black text-foreground font-mono">
                Executive Cognitive AI Agent Locked
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Student Pro unlocks real-time cognitive audits, circadian fatigue tracking, automatic bottleneck resolution, and direct Gemini 2.0 Pro copilot coaching.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2 text-left text-xs font-mono pt-2">
              <div className="p-2.5 rounded-xl bg-surface/80 border border-border/80 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span className="text-foreground font-medium">Circadian Fatigue Detection</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface/80 border border-border/80 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-foreground font-medium">Discipline Velocity Index</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface/80 border border-border/80 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-foreground font-medium">Proactive Bottleneck Breaker</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface/80 border border-border/80 flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-foreground font-medium">Uncapped AI Chat Memory</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="pt-4 flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleToggleProSandbox}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-primary text-black font-black text-xs sm:text-sm hover:scale-105 transition-all shadow-xl shadow-amber-500/25 cursor-pointer flex items-center gap-2"
              >
                <Crown className="w-4 h-4 fill-current" />
                <span>Unlock 7-Day Free Pro Sandbox (1-Click)</span>
              </button>

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate("pricing")}
                  className="px-4 py-3 rounded-2xl bg-surface hover:bg-muted border border-border/80 text-foreground font-bold text-xs transition-all cursor-pointer"
                >
                  View Pro Plans
                </button>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === "analysis" ? (
        /* ═══════════ ACTIVE PRO LIVE AUDIT TAB ═══════════ */
        <div className="p-4 sm:p-6 space-y-4">
          {/* Top 3 Metric Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Gauge 1: Velocity Score */}
            <div className="p-3.5 rounded-2xl bg-surface/70 border border-border/80 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-[10px] font-mono uppercase tracking-wider font-bold">
                <span>Discipline Velocity</span>
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono text-foreground">
                  {velocityScore}
                </span>
                <span className="text-xs text-muted-foreground font-mono">/ 100</span>
              </div>
              <div className="text-[11px] text-primary font-bold">
                {velocityScore >= 80 ? "🚀 Peak Flow Execution" : velocityScore >= 50 ? "⚡ Building Steady Momentum" : "🌱 Recovery Zone Active"}
              </div>
            </div>

            {/* Gauge 2: Energy & Circadian Window */}
            <div className="p-3.5 rounded-2xl bg-surface/70 border border-border/80 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-[10px] font-mono uppercase tracking-wider font-bold">
                <span>Biological Energy</span>
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className={`text-sm sm:text-base font-black font-mono ${energyStatus.color}`}>
                {energyStatus.label}
              </div>
              <div className="text-[11px] text-muted-foreground leading-tight">
                {energyStatus.desc}
              </div>
            </div>

            {/* Gauge 3: Stalled Bottleneck Status */}
            <div className="p-3.5 rounded-2xl bg-surface/70 border border-border/80 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-[10px] font-mono uppercase tracking-wider font-bold">
                <span>Identified Bottleneck</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xs sm:text-sm font-black text-foreground truncate">
                {bottleneckHabit ? bottleneckHabit.name : "Zero Stalled Tasks! 🎉"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {bottleneckHabit ? "Highest cognitive drag for today" : "Queue fully cleared"}
              </div>
            </div>
          </div>

          {/* AI Executive Action Prescription Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-surface to-cyan-500/10 border border-primary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-primary">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Autonomous Prescription for {primaryTrack.replace("_", " ").toUpperCase()} Track</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                {bottleneckHabit
                  ? `Your energy window is ideal for crushing "${bottleneckHabit.name}". Don't let cognitive hesitation build — launch a dedicated 25m sprint now.`
                  : "All current targets completed. Recommended: Run a 15m review or log your evening reflection."}
              </p>
            </div>

            {bottleneckHabit && onStartSprint && (
              <button
                type="button"
                onClick={() => {
                  feedbackSounds.playSprintLaunch();
                  onStartSprint(bottleneckHabit.name, bottleneckHabit.focus_duration_minutes || 25);
                  toast.success(`⚡ Sprint Launched for "${bottleneckHabit.name}"!`);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 text-white font-bold text-xs transition-all shadow-lg shadow-primary/25 cursor-pointer shrink-0 flex items-center gap-2 hover:scale-105"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Launch Prescribed Sprint (25m)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ═══════════ ACTIVE PRO QUICK CHAT TAB ═══════════ */
        <div className="p-4 sm:p-5 flex flex-col h-[360px]">
          {/* Quick Prompt Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none flex-shrink-0">
            {[
              "📊 Audit my momentum today",
              "⚡ How do I beat my bottleneck?",
              "⏱️ Plan my next 90 minutes",
              "🧘 Anti-Burnout Recovery Protocol",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSendQuery(prompt)}
                className="px-2.5 py-1 rounded-xl bg-surface hover:bg-primary/10 border border-border/80 text-[11px] font-mono text-muted-foreground hover:text-primary whitespace-nowrap transition-all cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "ai" && (
                  <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs shrink-0 mt-0.5">
                    🤖
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed space-y-1 relative group ${
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                      : "bg-surface border border-border/80 text-foreground rounded-tl-xs"
                  }`}
                >
                  <p>{m.text}</p>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground/70 font-mono pt-0.5">
                    <span>{m.time}</span>
                    {m.sender === "ai" && (
                      <button
                        onClick={() => handleCopy(idx, m.text)}
                        className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity"
                        title="Copy response"
                      >
                        {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-primary font-mono animate-pulse p-2">
                <Bot className="w-4 h-4 animate-spin" />
                <span>Cognitive Agent is analyzing telemetry...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="pt-2 border-t border-border/70 flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendQuery()}
              placeholder="Ask your Pro Performance Copilot anything..."
              className="flex-1 bg-surface border border-border/80 rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={() => handleSendQuery()}
              disabled={isThinking || !inputQuery.trim()}
              className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-primary/20"
              title="Send to Pro Agent"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
