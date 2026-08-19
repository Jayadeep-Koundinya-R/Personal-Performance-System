/*
  🤖 AI Performance Coach — Phase 2 Pro Engine with Conversation Memory
  
  Architecture:
  - Intent Classifier (src/lib/ai/intentClassifier.ts) identifies user intent
  - Response Templates (src/lib/ai/responseTemplates.ts) generate contextual replies
  - Coach Engine (src/lib/ai/coachEngine.ts) orchestrates the pipeline
  - AI Chat Service (src/lib/ai/aiChatService.ts) manages:
    * Continuous conversation memory across sessions (ai_conversations table & cache)
    * Pro-only gating to Gemini 2.0 Flash Edge Function
    * Instant offline & free user local engine fallback
  - 1-Click Pending Habit Checkoff Cards inside Chat
  - Clear history action & model badge indicator
*/

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";
import { useReflections } from "@/hooks/use-reflections";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { useReminders } from "@/hooks/use-reminders";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { buildHabitContext } from "@/lib/ai/coachEngine";
import {
  loadConversationHistory,
  saveConversationMessage,
  clearConversationHistory,
  dispatchCoachMessage,
  type ChatMessage,
} from "@/lib/ai/aiChatService";
import type { AgentActionPayload } from "@/lib/ai/agentTools";
import { Sparkles, Trash2, X, Send, Zap, Plus, Shield, Bell, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Resolve action habit placeholder IDs to real habit IDs by name matching.
 */
function resolveActionHabitIds(
  actions: { id: string; name: string }[] | undefined,
  habits: any[]
): { id: string; name: string }[] | undefined {
  if (!actions || actions.length === 0) return undefined;
  return actions.map((a) => {
    const match = habits.find((h) => h.name === a.name);
    return match ? { id: match.id, name: a.name } : a;
  });
}

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isLoggedIn, user } = useAuth();
  const { habits, addHabit, toggleCompletion, useStreakFreeze, isHabitDueToday, getTodayStr, getMaxStreak } = useHabits();
  const { entries: reflections } = useReflections();
  const { addReminder } = useReminders();
  const { changeTimerMode, startTimer, setActiveTaskName, setLinkedHabitId } = useFocusTimer();
  const { profile } = useProfile();
  const { limits, isPro } = useSubscription();

  // Load conversation memory when user signs in or opens widget
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      setIsLoadingHistory(true);
      const history = await loadConversationHistory(user?.id);
      if (isMounted) {
        setMessages(history);
        setIsLoadingHistory(false);
      }
    }
    if (isLoggedIn) {
      loadHistory();
    }
    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, user?.id]);

  // Build habit context once (memoized) — used by the local coach engine
  const habitContext = useMemo(
    () => buildHabitContext(habits, reflections, getMaxStreak, isHabitDueToday, getTodayStr, profile?.displayName || "there"),
    [habits, reflections, getMaxStreak, isHabitDueToday, getTodayStr, profile?.displayName]
  );

  const userMessageCount = messages.filter((m) => m.sender === "user").length;
  const conversationLimit = limits.aiConversationLimit;
  const isLimitReached = conversationLimit !== Infinity && userMessageCount >= conversationLimit;

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  if (!isLoggedIn) return null;

  const handleExecuteAgentAction = async (msgId: string, action: AgentActionPayload) => {
    try {
      if (action.actionType === "CREATE_HABIT") {
        const p = action.parameters;
        const err = await addHabit(p.name, p.category, p.period, p.priority);
        if (err) {
          toast.error(err);
          return;
        }
        toast.success(`✨ Created habit "${p.name}"!`);
      } else if (action.actionType === "FREEZE_STREAK") {
        const p = action.parameters;
        if (p.habitId) {
          const err = await useStreakFreeze(p.habitId);
          if (err) {
            toast.error(err);
            return;
          }
          toast.success(`🛡️ Streak Shield activated for "${p.habitName}"!`);
        }
      } else if (action.actionType === "SCHEDULE_REMINDER") {
        const p = action.parameters;
        const err = await addReminder(
          p.habitName,
          p.time,
          p.repeatPattern,
          p.habitId || null,
          "in_app",
          p.deliveryType
        );
        if (err) {
          toast.error(err);
          return;
        }
        toast.success(`⏰ ${p.deliveryType === "alarm" ? "Alarm" : "Reminder"} scheduled for ${p.displayTime}!`);
      } else if (action.actionType === "START_FOCUS_TIMER") {
        const p = action.parameters;
        if (p.habitName) setActiveTaskName(p.habitName);
        if (p.habitId) setLinkedHabitId(p.habitId);
        changeTimerMode("custom", p.durationMinutes);
        startTimer();
        toast.success(`🎯 Launched ${p.durationMinutes}-minute focus session!`);
      }

      // Mark action as executed in state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.agentAction
            ? { ...m, agentAction: { ...m.agentAction, status: "executed" } }
            : m
        )
      );
    } catch (err: any) {
      console.error("Failed to execute agent action:", err);
      toast.error("Failed to execute action. Please try again.");
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLimitReached || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Save user message to persistent history
    saveConversationMessage(user?.id, {
      sender: "user",
      text,
    });

    try {
      // Dispatch message through Pro Gemini 2.0 or local Smart Coach
      const result = await dispatchCoachMessage({
        message: text,
        habitContext,
        isPro,
        userId: user?.id,
        habits,
        reflections,
        chatHistory: messages,
      });

      const resolvedActions = resolveActionHabitIds(result.actionHabits, habits);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: result.text,
        actionHabits: resolvedActions,
        agentAction: result.agentAction,
        model: result.model,
        source: result.source,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Save AI response to persistent history
      saveConversationMessage(user?.id, {
        sender: "ai",
        text: result.text,
        actionHabits: resolvedActions,
        agentAction: result.agentAction,
        model: result.model,
        intent: result.detectedIntent,
      });
    } catch (err: any) {
      console.error("AI Coach dispatch exception:", err);
      // Fallback message
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "I ran into a temporary hiccup, but keep pushing on your daily habits! Ask me for a roast or daily audit anytime.",
        source: "local",
        model: "local",
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = async () => {
    await clearConversationHistory(user?.id);
    setMessages([
      {
        id: "cleared-greeting",
        sender: "ai",
        text: "Conversation cleared. What would you like to work on next?",
        source: "local",
        model: "local",
      },
    ]);
    toast.success("Chat history cleared");
  };

  const quickPrompts = [
    "Add habit: Read 20 pages at 9 PM 📖",
    "Start 25m focus timer 🎯",
    "Set alarm for 7:00 AM ⏰",
    "Freeze my streak 🛡️",
    "Daily Audit 📋",
    "Roast my performance 🔥",
    "Motivate me 💪",
    "Help ❓",
  ];

  return (
    <motion.div drag dragMomentum={false} className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end select-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mb-4 w-[360px] sm:w-[380px] max-h-[540px] h-[78vh] bg-card/95 backdrop-blur-2xl border border-primary/40 rounded-3xl flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 via-card to-secondary/20 border-b border-border/40 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-xl flex-shrink-0 shadow-inner">
                  🤖
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 font-mono">
                    <span>Performance AI Coach</span>
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pps-green animate-pulse" />
                    <span className="text-[10px] text-muted-foreground font-mono font-bold">Online</span>
                    {isPro ? (
                      <span className="text-[9.5px] bg-gradient-to-r from-amber-500/20 to-primary/20 text-amber-400 border border-amber-500/30 px-2 py-0.2 rounded-full font-mono font-bold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        <span>Gemini 2.0 Pro</span>
                      </span>
                    ) : (
                      <span className="text-[9.5px] bg-primary/15 text-primary border border-primary/30 px-2 py-0.2 rounded-full font-mono font-bold flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-primary" />
                        <span>Smart Local AI</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearChat}
                  title="Clear Chat History"
                  className="text-muted-foreground hover:text-destructive p-1.5 rounded-xl hover:bg-surface transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close Coach"
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-surface transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-xs font-mono">
                  <div className="animate-pulse flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Loading conversation memory…</span>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm space-y-2 font-medium ${
                        msg.sender === "user"
                          ? "bg-primary text-primary-foreground font-bold rounded-br-xs"
                          : "bg-surface border border-border/80 text-foreground rounded-bl-xs"
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.text}</div>

                      {/* Action Habits Buttons inside Chat */}
                      {msg.actionHabits && msg.actionHabits.length > 0 && (
                        <div className="pt-2 border-t border-border/40 space-y-1.5">
                          <div className="text-[10.5px] font-mono font-extrabold text-primary uppercase">1-Click Quick Complete:</div>
                          {msg.actionHabits.map((h) => (
                            <button
                              key={h.id}
                              onClick={() => {
                                toggleCompletion(h.id);
                                toast.success(`Completed ${h.name}!`);
                              }}
                              className="w-full text-left text-[11px] font-extrabold bg-primary/15 text-primary border border-primary/30 px-3 py-1.5 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer flex items-center justify-between"
                            >
                              <span>✓ Complete "{h.name}"</span>
                              <span>+10 XP</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Autonomous Agent Interactive Tool Cards */}
                      {msg.agentAction && (
                        <div className="pt-2 border-t border-border/50">
                          <div className="bg-card/90 border border-primary/40 rounded-xl p-3 space-y-2.5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-extrabold text-primary uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-primary" />
                                <span>Agent Action</span>
                              </span>
                              {msg.agentAction.status === "executed" && (
                                <span className="text-[9.5px] font-mono font-bold text-pps-green flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-pps-green" />
                                  <span>Executed</span>
                                </span>
                              )}
                            </div>

                            <div>
                              <div className="font-extrabold text-foreground text-xs">{msg.agentAction.title}</div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">{msg.agentAction.description}</div>
                            </div>

                            {msg.agentAction.status === "executed" ? (
                              <div className="bg-pps-green/10 border border-pps-green/30 text-pps-green text-[11px] font-bold py-1.5 px-3 rounded-lg text-center flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Action Successfully Completed</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleExecuteAgentAction(msg.id, msg.agentAction!)}
                                className="w-full bg-gradient-to-r from-primary to-accent text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-md shadow-primary/20 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                {msg.agentAction.actionType === "CREATE_HABIT" && <Plus className="w-3.5 h-3.5" />}
                                {msg.agentAction.actionType === "FREEZE_STREAK" && <Shield className="w-3.5 h-3.5" />}
                                {msg.agentAction.actionType === "SCHEDULE_REMINDER" && <Bell className="w-3.5 h-3.5" />}
                                {msg.agentAction.actionType === "START_FOCUS_TIMER" && <Clock className="w-3.5 h-3.5" />}
                                <span>Confirm & Execute →</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-surface border border-border/80 rounded-2xl rounded-bl-xs px-4 py-3 flex gap-1.5 items-center">
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 bg-primary rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-primary rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Prompts */}
            <div className="p-3 border-t border-border/40 bg-card space-y-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="whitespace-nowrap px-3 py-1.5 rounded-xl border border-border/80 bg-surface hover:bg-primary/15 hover:border-primary/40 text-foreground transition-all text-[10.5px] font-extrabold cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Form Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input);
                }}
                className="flex items-center gap-2 relative"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask AI Coach... (e.g. Audit my day)"
                  className="flex-1 bg-surface border border-border/80 text-xs font-bold rounded-xl pl-3.5 pr-10 py-2.5 outline-none text-foreground focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-1.5 w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 cursor-pointer hover:bg-primary/90 transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Widget Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent text-primary-foreground shadow-2xl flex items-center justify-center relative border border-white/20 cursor-pointer"
      >
        <span className="text-2xl drop-shadow-md">{isOpen ? "✕" : "🤖"}</span>
      </motion.button>
    </motion.div>
  );
}

