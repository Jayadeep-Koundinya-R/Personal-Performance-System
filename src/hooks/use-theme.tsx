/*
  🎨 Custom Hook & Provider for Account-Scoped Theme Sync
  
  - Fast instant load from localStorage (fallback for guests / offline)
  - Cloud-persisted to user_settings.theme in Supabase for authenticated users
  - Realtime cross-device theme sync (changing on phone updates laptop live)
  - Toggles "dark" / "light" classes on document.documentElement
*/

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("pps_theme");
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  // ── 1. Apply DOM Classes & LocalStorage Cache ──
  const applyThemeToDom = useCallback((targetTheme: Theme) => {
    const root = document.documentElement;
    if (targetTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem("pps_theme", targetTheme);
    } catch {}
  }, []);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme, applyThemeToDom]);

  // ── 2. Cloud Fetch & Realtime Multi-Device Sync ──
  useEffect(() => {
    let isMounted = true;

    // Detect authenticated user
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const uid = data?.session?.user?.id || null;
      setCurrentUserId(uid);
      if (uid) {
        loadUserCloudTheme(uid);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const uid = session?.user?.id || null;
      setCurrentUserId(uid);
      if (uid) {
        loadUserCloudTheme(uid);
      }
    });

    async function loadUserCloudTheme(uid: string) {
      try {
        const { data, error } = await supabase
          .from("user_settings")
          .select("theme")
          .eq("user_id", uid)
          .maybeSingle();

        if (!error && data?.theme && (data.theme === "dark" || data.theme === "light")) {
          if (isMounted) {
            setThemeState(data.theme as Theme);
            applyThemeToDom(data.theme as Theme);
          }
        }
      } catch (err) {
        console.error("Failed to load user theme from cloud:", err);
      }
    }

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [applyThemeToDom]);

  // ── 3. Realtime Listener for Incoming Remote Theme Changes ──
  useEffect(() => {
    if (!currentUserId) return;

    const channelId = `realtime-theme-sync-${currentUserId}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_settings", filter: `user_id=eq.${currentUserId}` },
        (payload: any) => {
          const remoteTheme = payload?.new?.theme;
          if (remoteTheme === "dark" || remoteTheme === "light") {
            setThemeState(remoteTheme);
            applyThemeToDom(remoteTheme);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [currentUserId, applyThemeToDom]);

  // ── 4. Set Theme (Local + Cloud Sync) ──
  const setTheme = useCallback(
    async (nextTheme: Theme) => {
      setThemeState(nextTheme);
      applyThemeToDom(nextTheme);

      if (currentUserId && !isSyncingRef.current) {
        isSyncingRef.current = true;
        try {
          await supabase
            .from("user_settings")
            .upsert(
              {
                user_id: currentUserId,
                theme: nextTheme,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );
        } catch (err) {
          console.error("Failed to sync theme preference to cloud:", err);
        } finally {
          isSyncingRef.current = false;
        }
      }
    },
    [currentUserId, applyThemeToDom]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
