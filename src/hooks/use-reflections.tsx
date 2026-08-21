import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const isGuestUser = isGuest || !userId || userId === "guest_local" || userId.startsWith("guest");

  const refresh = useCallback(async () => {
    if (isGuestUser) {
      try {
        const raw = JSON.parse(localStorage.getItem(GUEST_KEY(userEmail)) || "[]") as ReflectionEntry[];
        setEntries(raw);
      } catch {
        setEntries([]);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("reflections")
        .select("*")
        .eq("user_id", userId!)
        .order("reflection_date", { ascending: false });

      if (error) {
        console.error("Error fetching reflections from Supabase:", error);
        toast.error("Failed to load reflections from cloud database.");
      } else {
        const mapped: ReflectionEntry[] = (data || []).map((r: any) => ({
          id: r.id || `${Date.now()}-${Math.random()}`,
          date: r.reflection_date || r.date || r.created_at?.split("T")[0] || "",
          text: r.content || r.text || "",
          mood: r.mood || "great",
          habitsLog: (r.habits_log as ReflectionEntry["habitsLog"]) || [],
        }));

        let filtered = mapped;
        if (historyDays !== Infinity) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - historyDays);
          const cutoffStr = cutoff.toISOString().split("T")[0];
          filtered = filtered.filter((r) => r.date >= cutoffStr);
        }
        setEntries(filtered);
      }
    } catch (err: any) {
      console.error("Network exception fetching reflections:", err);
      toast.error("Network error loading reflections.");
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail, isGuestUser, historyDays]);

  useEffect(() => {
    refresh();

    if (!isGuestUser && userId) {
      try {
        const channel = supabase
          .channel("reflections-realtime")
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
      } catch (err) {
        console.error("Failed to subscribe to reflections realtime:", err);
      }
    }
  }, [refresh, isGuestUser, userId]);

  const saveEntry = useCallback(
    async (text: string, mood: string) => {
      if (!text.trim()) return "Write something first.";
      const today = new Date().toISOString().split("T")[0];

      if (isGuestUser) {
        const list = [...entries];
        const idx = list.findIndex((e) => e.date === today);
        const entry: ReflectionEntry = { id: today, date: today, text: text.trim(), mood, habitsLog: [] };
        if (idx >= 0) list[idx] = entry;
        else list.unshift(entry);
        localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(list));
        setEntries(list);
        toast.success("Guest reflection saved locally.");
        return null;
      }

      try {
        const { error } = await supabase.from("reflections").upsert(
          {
            user_id: userId!,
            reflection_date: today,
            content: text.trim(),
            mood,
            habits_log: [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,reflection_date" }
        );

        if (error) {
          console.error("Failed to save reflection to database:", error);
          toast.error(`Cloud save failed: ${error.message || "Database error"}`);
          return error.message || "Failed to save reflection to database.";
        }

        await refresh();
        toast.success("Daily reflection saved to cloud!");
        return null;
      } catch (err: any) {
        console.error("Exception saving reflection:", err);
        const errMsg = err?.message || "Unexpected error saving reflection";
        toast.error(`Cloud save failed: ${errMsg}`);
        return errMsg;
      }
    },
    [entries, userId, userEmail, isGuestUser, refresh]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (isGuestUser) {
        const list = entries.filter((e) => e.id !== id && e.date !== id);
        localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(list));
        setEntries(list);
        toast.success("Guest reflection removed.");
        return;
      }

      try {
        const { error } = await supabase.from("reflections").delete().eq("id", id).eq("user_id", userId!);
        if (error) {
          console.error("Failed to delete reflection from database:", error);
          toast.error(`Delete failed: ${error.message}`);
          return;
        }
        await refresh();
        toast.success("Reflection deleted from cloud.");
      } catch (err: any) {
        console.error("Exception deleting reflection:", err);
        toast.error("Network error deleting reflection.");
      }
    },
    [entries, userId, userEmail, isGuestUser, refresh]
  );

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
