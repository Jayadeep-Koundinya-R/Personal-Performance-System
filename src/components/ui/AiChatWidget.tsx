/*
  🤖 Masterwork AI Performance Coach & Smart Assistant
  
  Features:
  - Smart Local Fallback Coach Engine (Analyzes active habits, pending tasks & streaks locally)
  - 1-Click Pending Habit Checkoff Cards inside Chat
  - Expanded Quick Action Prompts (Roast, Daily Audit, Procrastination, Streak Rescue)
  - High-Contrast Glassmorphic Crisp Design
*/

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";
import { useReflections } from "@/hooks/use-reflections";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Flame, Check, Zap, MessageSquare, Shield, X, Send } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  actionHabits?: { id: string; name: string }[];
}

// Local Smart Coach Fallback Generator with Short-Term Conversation Memory
function generateLocalCoachAdvice(
  prompt: string,
  habits: any[],
  reflections: any[],
  getMaxStreak: () => number,
  isHabitDueToday: (h: any) => boolean,
  getTodayStr: () => string,
  chatHistory: Message[] = []
): { text: string; actionHabits?: { id: string; name: string }[] } {
  const todayStr = getTodayStr();
  const dueHabits = habits.filter((h) => isHabitDueToday(h) && !h.archived);
  const completedToday = dueHabits.filter((h) => (h.completedDates || []).includes(todayStr));
  const pendingToday = dueHabits.filter((h) => !(h.completedDates || []).includes(todayStr));
  const maxStreak = getMaxStreak();

  const lower = prompt.toLowerCase();
  const lastUserMsg = chatHistory.filter(m => m.sender === "user").slice(-2)[0]?.text?.toLowerCase() || "";

  // 1. Roast Performance
  if (lower.includes("roast") || lower.includes("burn")) {
    if (pendingToday.length > 0) {
      return {
        text: `🔥 ROAST ALERT: You have ${pendingToday.length} pending habits today including "${pendingToday[0]?.name}"! Your best streak is ${maxStreak} days, but excuses don't build momentum. Knock these out right now!`,
        actionHabits: pendingToday.map((h) => ({ id: h.id, name: h.name })),
      };
    } else if (dueHabits.length > 0) {
      return {
        text: `🔥 Clean sweep today! 100% of your habits are done. I wanted to roast you, but you're actually executing. Keep this ${maxStreak}-day streak alive!`,
      };
    } else {
      return {
        text: `🔥 You don't have any habits configured for today! Build a new habit in Habit Architect before you start slacking!`,
      };
    }
  }

  // 2. Daily Audit / Pending Tasks
  if (lower.includes("audit") || lower.includes("goal") || lower.includes("pending")) {
    if (pendingToday.length > 0) {
      return {
        text: `📋 DAILY AUDIT: You have completed ${completedToday.length}/${dueHabits.length} habits today (${Math.round((completedToday.length / (dueHabits.length || 1)) * 100)}%).\n\nPending items remaining:`,
        actionHabits: pendingToday.map((h) => ({ id: h.id, name: h.name })),
      };
    } else {
      return {
        text: `🎯 EXCELLENT: You are 100% completed for today! All ${completedToday.length} due habits checked off cleanly.`,
      };
    }
  }

  // 3. Procrastination / Focus
  if (lower.includes("procrastinat") || lower.includes("work") || lower.includes("focus")) {
    return {
      text: `🧠 DEEP FOCUS TIP: Use the 2-Minute Rule. Start your hardest pending habit for just 120 seconds in Focus Studio. Action creates motivation, not the other way around!`,
    };
  }

  // 4. Streak Rescue
  if (lower.includes("streak") || lower.includes("rescue") || lower.includes("shield")) {
    return {
      text: `🛡️ STREAK ADVICE: Your best streak is ${maxStreak} days. Don't break the chain! If you are at risk today, complete at least 1 high-priority habit or deploy a Streak Shield!`,
    };
  }

  // Generic Intelligent Reply
  return {
    text: `⚡ COACH ANALYSIS: You've completed ${completedToday.length}/${dueHabits.length} habits today with a top streak of ${maxStreak} days. Stay focused on high-priority goals!`,
    actionHabits: pendingToday.slice(0, 3).map((h) => ({ id: h.id, name: h.name })),
  };
}

async function fetchDirectGeminiResponse(
  apiKey: string,
  userMessage: string,
  habits: any[],
  reflections: any[],
  chatHistory: Message[]
): Promise<string | null> {
  try {
    const habitsContext = habits.map(h => `- ${h.name} (${h.category}): Streak ${h.streak} days, last completed: ${h.lastCompletedDate || "never"}`).join("\n");
    const reflectionsContext = reflections.slice(0, 3).map(r => `- ${r.date}: Mood ${r.mood}, Note: "${r.text}"`).join("\n");

    const systemPrompt = `You are the AI Performance Coach for Personal Performance System (PPS). Your job is to motivate, audit, roast, or advise the user based on their real habit data.
User's Active Habits:
${habitsContext || "No habits logged yet."}

User's Recent Reflections:
${reflectionsContext || "No recent reflections."}

Be concise, constructive, action-oriented, and encouraging (or funny/spicy if they ask for a roast). Keep responses under 4 sentences.`;

    // Filter chat history to ensure strict alternating roles (user -> model -> user)
    const rawHistory = chatHistory.slice(-6).map(m => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    const sanitizedContents: { role: string; parts: { text: string }[] }[] = [];
    for (const msg of rawHistory) {
      if (sanitizedContents.length === 0 || sanitizedContents[sanitizedContents.length - 1].role !== msg.role) {
        sanitizedContents.push(msg);
      }
    }

    if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === "user") {
      sanitizedContents.pop();
    }

    sanitizedContents.push({ role: "user", parts: [{ text: userMessage }] });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: sanitizedContents,
      }),
    });

    if (!response.ok) return null;
    const json = await response.json();
    const replyText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    return replyText || null;
  } catch {
    return null;
  }
}

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "Hey! I'm your AI Performance Coach. Ask me for a performance roast, daily audit, or focus tips!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isLoggedIn } = useAuth();
  const { habits, toggleCompletion, isHabitDueToday, getTodayStr, getMaxStreak } = useHabits();
  const { entries: reflections } = useReflections();
  const { limits } = useSubscription();

  const userMessageCount = messages.filter((m) => m.sender === "user").length;
  const conversationLimit = limits.aiConversationLimit;
  const isLimitReached = conversationLimit !== Infinity && userMessageCount >= conversationLimit;

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  if (!isLoggedIn) return null;

  const handleSend = async (text: string) => {
    if (!text.trim() || isLimitReached) return;

    const newMsg: Message = { id: Date.now().toString(), sender: "user", text };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // 1. Attempt Supabase Edge Function invoke
      const { data, error } = await supabase.functions.invoke("ai-coach-chat", {
        body: {
          message: text,
          habits: habits.map((h) => ({
            name: h.name,
            category: h.category,
            streak: h.streak,
            lastCompletedDate: h.lastCompletedDate,
            period: h.period,
          })),
          reflections: reflections.map((r) => ({
            date: r.date,
            mood: r.mood,
            text: r.text,
          })),
          chatHistory: messages.slice(-10),
        },
      });

      if (!error && data?.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: data.text,
          },
        ]);
        return;
      }

      // 2. Direct Gemini API call if VITE_GEMINI_API_KEY is present
      const clientApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (clientApiKey) {
        const geminiReply = await fetchDirectGeminiResponse(
          clientApiKey,
          text,
          habits,
          reflections,
          messages
        );
        if (geminiReply) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: "ai",
              text: geminiReply,
            },
          ]);
          return;
        }
      }

      // 3. Fall back to Local Smart Coach Engine
      const fallback = generateLocalCoachAdvice(text, habits, reflections, getMaxStreak, isHabitDueToday, getTodayStr, messages);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: fallback.text,
          actionHabits: fallback.actionHabits,
        },
      ]);
    } catch (err: any) {
      // Graceful local engine fallback on exception
      const fallback = generateLocalCoachAdvice(text, habits, reflections, getMaxStreak, isHabitDueToday, getTodayStr, messages);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: fallback.text,
          actionHabits: fallback.actionHabits,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    "Roast my performance 🔥",
    "Daily Audit & Pending Tasks 📋",
    "How to beat procrastination 🧠",
    "Streak Rescue Advice 🛡️",
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
            className="mb-4 w-[360px] sm:w-[380px] max-h-[520px] h-[75vh] bg-card/95 backdrop-blur-2xl border border-primary/40 rounded-3xl flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 via-card to-secondary/20 border-b border-border/40 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-xl flex-shrink-0">
                  🤖
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 font-mono">
                    <span>Performance AI Coach</span>
                  </h3>
                  <p className="text-[10.5px] text-pps-green font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pps-green animate-pulse" />
                    <span>Online & Analyzing</span>
                    <span className="text-[9.5px] bg-primary/15 text-primary border border-primary/30 px-2 py-0.2 rounded-full font-mono font-bold lowercase tracking-normal">
                      ai-v1.5
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-300 hover:text-foreground p-1.5 rounded-xl hover:bg-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {messages.map((msg) => (
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
                  </div>
                </div>
              ))}

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
