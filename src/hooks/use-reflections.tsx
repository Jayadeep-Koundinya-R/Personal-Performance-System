import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ReflectionEntry {
  id: string;
  date: string;
  text: string;
  mood: string;
  habitsLog: Array<{ name: string; completed: boolean }>;
}

interface ReflectionsContextType {
  entries: ReflectionEntry[];
  loading: boolean;
  saveEntry: (text: string, mood: string) => Promise<string | null>;
  deleteEntry: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ReflectionsContext = createContext<ReflectionsContextType | null>(null);

const GUEST_KEY = (email: string | null) => `reflections_${email || "guest"}`;

export function ReflectionsProvider({
  children,
  userId,
  userEmail,
  isGuest,
  historyDays = Infinity,
}: {
  children: ReactNode;
  userId?: string;
  userEmail: string | null;
  isGuest?: boolean;
  historyDays?: number;
}) {
  const [entries, setEntries] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (isGuest || !userId) {
      try {
        const raw = JSON.parse(localStorage.getItem(GUEST_KEY(userEmail)) || "[]") as ReflectionEntry[];
        setEntries(raw);
      } catch {
        setEntries([]);
      }
      setLoading(false);
      return;
    }

    let query = supabase
      .from("reflections")
      .select("*")
      .eq("user_id", userId)
      .order("reflection_date", { ascending: false });

    if (historyDays !== Infinity) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - historyDays);
      query = query.gte("reflection_date", cutoff.toISOString().split("T")[0]);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Reflections load error:", error);
      setEntries([]);
    } else {
      setEntries(
        (data || []).map((r) => ({
          id: r.id,
          date: r.reflection_date,
          text: r.content,
          mood: r.mood,
          habitsLog: (r.habits_log as ReflectionEntry["habitsLog"]) || [],
        }))
      );
    }
    setLoading(false);
  }, [userId, userEmail, isGuest, historyDays]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveEntry = useCallback(async (text: string, mood: string) => {
    if (!text.trim()) return "Write something first.";
    const today = new Date().toISOString().split("T")[0];

    if (isGuest || !userId) {
      const list = [...entries];
      const idx = list.findIndex((e) => e.date === today);
      const entry: ReflectionEntry = { id: today, date: today, text: text.trim(), mood, habitsLog: [] };
      if (idx >= 0) list[idx] = entry;
      else list.unshift(entry);
      localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(list));
      setEntries(list);
      return null;
    }

    const { error } = await supabase.from("reflections").upsert(
      {
        user_id: userId,
        reflection_date: today,
        content: text.trim(),
        mood,
        habits_log: [],
      },
      { onConflict: "user_id,reflection_date" }
    );
    if (error) return error.message;
    await refresh();
    return null;
  }, [entries, userId, userEmail, isGuest, refresh]);

  const deleteEntry = useCallback(async (id: string) => {
    if (isGuest || !userId) {
      const list = entries.filter((e) => e.id !== id && e.date !== id);
      localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(list));
      setEntries(list);
      return;
    }
    await supabase.from("reflections").delete().eq("id", id);
    await refresh();
  }, [entries, userId, userEmail, isGuest, refresh]);

  return (
    <ReflectionsContext.Provider value={{ entries, loading, saveEntry, deleteEntry, refresh }}>
      {children}
    </ReflectionsContext.Provider>
  );
}

export function useReflections() {
  const ctx = useContext(ReflectionsContext);
  if (!ctx) throw new Error("useReflections must be used within ReflectionsProvider");
  return ctx;
}
