import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export interface User {
  email: string | null;
  isGuest: boolean;
  id?: string;
}

interface AuthReturn {
  user: User | null;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (email: string, password: string, confirm: string) => Promise<string | null>;
  loginAsGuest: () => void;
  logout: () => void;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  isLoggedIn: boolean;
  loading: boolean;
}

function mapUser(su: SupabaseUser | null): User | null {
  if (!su) return null;
  return { email: su.email ?? null, isGuest: false, id: su.id };
}

export function useAuth(): AuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapUser(session.user));
      } else if (sessionStorage.getItem("pps_guest") === "true") {
        setUser({ email: null, isGuest: true });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapUser(session.user));
      } else if (sessionStorage.getItem("pps_guest") === "true") {
        setUser({ email: null, isGuest: true });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!email || !password) return "Please fill in all fields.";
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });
    if (error) return error.message;
    navigate("/dashboard");
    return null;
  }, [navigate]);

  const signup = useCallback(async (email: string, password: string, confirm: string): Promise<string | null> => {
    if (!email || !password || !confirm) return "Please fill in all fields.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirm) return "Passwords do not match.";

    const { error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
    });
    if (error) return error.message;
    navigate("/dashboard");
    return null;
  }, [navigate]);

  const loginAsGuest = useCallback(() => {
    const guestUser: User = { email: null, isGuest: true };
    // Persist guest flag so auth listener doesn't overwrite this temporary session
    try { sessionStorage.setItem("pps_guest", "true"); } catch {}
    setUser(guestUser);
    navigate("/dashboard");
  }, [navigate]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    try { sessionStorage.removeItem("pps_guest"); } catch {}
    setUser(null);
    navigate("/login");
  }, [navigate]);

  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    if (!email) return "Please enter your email.";
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return error.message;
    return null;
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<string | null> => {
    if (!password || password.length < 6) return "Password must be at least 6 characters.";
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return error.message;
    return null;
  }, []);

  return {
    user,
    login,
    signup,
    loginAsGuest,
    logout,
    resetPassword,
    updatePassword,
    isLoggedIn: user !== null,
    loading,
  };
}
