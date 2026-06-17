import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
  id?: string;
  display_name: string;
  total_xp: number;
  level: number;
  streak: number;
  freeze_credits: number;
  total_credits_used: number;
  perfect_days: string[];
  login_streak: number;
  last_login_date: string | null;
  xp_per_completion: number;
  max_freeze_credits: number;
}

export interface AuthUser {
  id: string;
  email: string | null;
  name: string;
  isGuest: boolean;
  expiry?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  loginAsGuest: (name?: string) => void;
  logout: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_SESSION_KEY = 'currentUser';
const GUEST_PROFILE_KEY = 'pps_profile_guest';

const defaultGuestProfile: UserProfile = {
  display_name: 'Apex Performer',
  total_xp: 0,
  level: 1,
  streak: 0,
  freeze_credits: 2,
  total_credits_used: 0,
  perfect_days: [],
  login_streak: 1,
  last_login_date: new Date().toISOString().split('T')[0],
  xp_per_completion: 10,
  max_freeze_credits: 2
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync / Fetch user profile metadata
  const fetchUserProfile = async (userId: string, email: string): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileErr) {
        if (profileErr.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const initialProfile: UserProfile = {
            id: userId,
            display_name: email.split('@')[0] || 'Apex Performer',
            total_xp: 0,
            level: 1,
            streak: 0,
            freeze_credits: 2,
            total_credits_used: 0,
            perfect_days: [],
            login_streak: 1,
            last_login_date: new Date().toISOString().split('T')[0],
            xp_per_completion: 10,
            max_freeze_credits: 2
          };

          const { data: newProfile, error: createErr } = await supabase
            .from('profiles')
            .insert(initialProfile)
            .select()
            .single();

          if (createErr) throw createErr;
          return newProfile;
        }
        throw profileErr;
      }
      return data;
    } catch (err: any) {
      console.error('[Auth] Error fetching user profile:', err);
      return null;
    }
  };

  const handleAuthChange = async (supabaseUser: SupabaseUser | null) => {
    setIsLoading(true);
    setError(null);

    if (supabaseUser) {
      const authUser: AuthUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: '', // Will update from profile
        isGuest: false
      };

      const userProfile = await fetchUserProfile(supabaseUser.id, supabaseUser.email || '');
      if (userProfile) {
        authUser.name = userProfile.display_name;
        setProfile(userProfile);
      } else {
        authUser.name = supabaseUser.email?.split('@')[0] || 'Apex Performer';
        setProfile({
          ...defaultGuestProfile,
          display_name: authUser.name
        });
      }

      setUser(authUser);
      localStorage.setItem('currentUser', JSON.stringify(authUser));
    } else {
      // Check for guest session in localStorage
      const cached = localStorage.getItem(GUEST_SESSION_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as AuthUser;
          if (parsed.isGuest) {
            // Check expiry
            if (parsed.expiry && Date.now() > parsed.expiry) {
              localStorage.removeItem(GUEST_SESSION_KEY);
              setUser(null);
              setProfile(null);
            } else {
              setUser(parsed);
              const guestProf = localStorage.getItem(GUEST_PROFILE_KEY);
              setProfile(guestProf ? JSON.parse(guestProf) : { ...defaultGuestProfile, display_name: parsed.name });
            }
          } else {
            // Logged in user cached but no supabase session -> clear it
            localStorage.removeItem(GUEST_SESSION_KEY);
            setUser(null);
            setProfile(null);
          }
        } catch {
          localStorage.removeItem(GUEST_SESSION_KEY);
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    }
    setIsLoading(false);
  };

  // Initial session check
  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null;

    if (isSupabaseConfigured()) {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        handleAuthChange(session?.user || null);
      });

      // Listen for auth changes
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        handleAuthChange(session?.user || null);
      });
      authSubscription = data.subscription;
    } else {
      // No Supabase, load Guest Session from localStorage if available
      handleAuthChange(null);
    }

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // Update profile in memory and source
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    setProfile(updated);

    if (user && !user.isGuest && isSupabaseConfigured()) {
      try {
        const { error: err } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);
        if (err) throw err;
      } catch (err: any) {
        console.error('[Auth] Error updating profile in database:', err);
      }
    } else {
      // Guest Profile save
      localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(updated));
    }
  };

  const refreshProfile = async () => {
    if (user && !user.isGuest) {
      const p = await fetchUserProfile(user.id, user.email || '');
      if (p) setProfile(p);
    }
  };

  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Use Guest Mode instead.');
      }
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setIsLoading(false);
      throw err;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setError(null);
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured.');
      }
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name }
        }
      });
      if (err) throw err;

      if (data.user) {
        // Explicitly create profile to ensure display name maps correctly
        const initialProfile: UserProfile = {
          id: data.user.id,
          display_name: name || email.split('@')[0],
          total_xp: 0,
          level: 1,
          streak: 0,
          freeze_credits: 2,
          total_credits_used: 0,
          perfect_days: [],
          login_streak: 1,
          last_login_date: new Date().toISOString().split('T')[0],
          xp_per_completion: 10,
          max_freeze_credits: 2
        };

        const { error: profileErr } = await supabase
          .from('profiles')
          .insert(initialProfile);

        if (profileErr) console.error('[Auth] Profile creation error on signup:', profileErr);
      }
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
      setIsLoading(false);
      throw err;
    }
  };

  const loginAsGuest = (name?: string) => {
    setError(null);
    const displayName = name?.trim() || 'Apex Performer';
    const guestUser: AuthUser = {
      id: 'guest_' + Date.now(),
      email: null,
      name: displayName,
      isGuest: true,
      expiry: Date.now() + 24 * 3600 * 1000 // 24 Hours expiry
    };

    const guestProfile: UserProfile = {
      ...defaultGuestProfile,
      display_name: displayName
    };

    setUser(guestUser);
    setProfile(guestProfile);
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guestUser));
    localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(guestProfile));
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (user && !user.isGuest && isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('[Auth] Error signing out of Supabase:', err);
    } finally {
      localStorage.removeItem(GUEST_SESSION_KEY);
      localStorage.removeItem(GUEST_PROFILE_KEY);
      setUser(null);
      setProfile(null);
      setIsLoading(false);
    }
  };

  const updateDisplayName = async (name: string) => {
    if (!profile) return;
    const cleanName = name.trim();
    if (!cleanName) return;

    await updateProfile({ display_name: cleanName });

    if (user) {
      const updatedUser = { ...user, name: cleanName };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  const updatePassword = async (password: string) => {
    if (user?.isGuest) {
      throw new Error('Passwords cannot be changed in Guest Mode.');
    }
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) throw err;
  };

  const addXp = async (amount: number) => {
    if (!profile) return;
    const nextXp = profile.total_xp + amount;
    const nextLevel = Math.floor(nextXp / (profile.max_freeze_credits * 50 || 100)) + 1; // Or default threshold

    await updateProfile({
      total_xp: nextXp,
      level: nextLevel
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        error,
        login,
        signUp,
        loginAsGuest,
        logout,
        updateDisplayName,
        updatePassword,
        addXp,
        updateProfile,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
