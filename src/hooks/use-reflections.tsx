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

let reflectionsTableUnavailable = false;

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
    const isGuestUser = isGuest || !userId || userId === "guest_local" || userId.startsWith("guest");
    const loadFromLocalStorage = () => {
      try {
        const raw = JSON.parse(localStorage.getItem(GUEST_KEY(userEmail)) || "[]") as ReflectionEntry[];
        setEntries(raw);
      } catch {
        setEntries([]);
      }
    };

    if (isGuestUser || reflectionsTableUnavailable) {
      loadFromLocalStorage();
      setLoading(false);
      return;
    }

    try {
      // Query without column filters in URL to prevent PostgREST 400 schema errors
      const { data, error } = await supabase
        .from("reflections")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        reflectionsTableUnavailable = true;
        loadFromLocalStorage();
      } else {
        const mapped = (data || []).map((r: any) => ({
          id: r.id || `${Date.now()}-${Math.random()}`,
          date: r.reflection_date || r.date || r.created_at?.split("T")[0] || "",
          text: r.content || r.text || "",
          mood: r.mood || "great",
          habitsLog: (r.habits_log as ReflectionEntry["habitsLog"]) || [],
        }));

        // Filter and sort by date descending in JavaScript
        let filtered = mapped;
        if (historyDays !== Infinity) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - historyDays);
          const cutoffStr = cutoff.toISOString().split("T")[0];
          filtered = filtered.filter((r) => r.date >= cutoffStr);
        }
        filtered.sort((a, b) => b.date.localeCompare(a.date));
        setEntries(filtered);
      }
    } catch {
      reflectionsTableUnavailable = true;
      loadFromLocalStorage();
    }
    setLoading(false);
  }, [userId, userEmail, isGuest, historyDays]);

  useEffect(() => {
    refresh();

    if (!isGuest && userId && !reflectionsTableUnavailable) {
      try {
        const channel = supabase
          .channel("reflections-changes")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "reflections", filter: `user_id=eq.${userId}` },
            () => {
              refresh();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch {}
    }
  }, [refresh, isGuest, userId]);

  const saveEntry = useCallback(async (text: string, mood: string) => {
    if (!text.trim()) return "Write something first.";
    const today = new Date().toISOString().split("T")[0];
    const isGuestUser = isGuest || !userId || userId === "guest_local" || userId.startsWith("guest");

    if (isGuestUser) {
      const list = [...entries];
      const idx = list.findIndex((e) => e.date === today);
      const entry: ReflectionEntry = { id: today, date: today, text: text.trim(), mood, habitsLog: [] };
      if (idx >= 0) list[idx] = entry;
      else list.unshift(entry);
      localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(list));
      setEntries(list);
      return null;
    }

    try {
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
      if (error) {
        // Fallback to localStorage
        const list = [...entries];
        const idx = list.findIndex((e) => e.date === today);
        const entry: ReflectionEntry = { id: today, date: today, text: text.trim(), mood, habitsLog: [] };
        if (idx >= 0) list[idx] = entry;
        else list.unshift(entry);
        localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(list));
        setEntries(list);
        return null;
      }
      await refresh();
      return null;
    } catch {
      const list = [...entries];
      const idx = list.findIndex((e) => e.date === today);
      const entry: ReflectionEntry = { id: today, date: today, text: text.trim(), mood, habitsLog: [] };
      if (idx >= 0) list[idx] = entry;
      else list.unshift(entry);
      localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(list));
      setEntries(list);
      return null;
    }
  }, [entries, userId, userEmail, isGuest, refresh]);

  const deleteEntry = useCallback(async (id: string) => {
    const isGuestUser = isGuest || !userId || userId === "guest_local" || userId.startsWith("guest");
    if (isGuestUser) {
      const list = entries.filter((e) => e.id !== id && e.date !== id);
      localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(list));
      setEntries(list);
      return;
    }
    try {
      await supabase.from("reflections").delete().eq("id", id);
      await refresh();
    } catch {
      const list = entries.filter((e) => e.id !== id && e.date !== id);
      localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(list));
      setEntries(list);
    }
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
