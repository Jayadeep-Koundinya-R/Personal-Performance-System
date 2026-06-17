import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export const Login: React.FC = () => {
  const { login, signUp, loginAsGuest, error: authError, isLoading } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabaseActive = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);

    if (!supabaseActive) {
      setLocalError('Supabase is not configured. Please use Guest Mode to try the system locally.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setLocalError('Email and Password are required.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    try {
      if (isRegistering) {
        if (!name.trim()) {
          setLocalError('Display Name is required.');
          return;
        }
        await signUp(email, password, name);
        setSuccessMsg('Registration successful! Please check your email to confirm or sign in.');
        setIsRegistering(false);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      // Errors handled by useAuth or thrown
      setLocalError(err.message || 'Authentication failed.');
    }
  };

  const handleGuestMode = () => {
    loginAsGuest(name.trim() || 'Apex Performer');
  };

  return (
    <div className="min-height-screen w-full flex items-center justify-center p-6 bg-bg text-text relative overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Background Orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-accent/5 blur-[80px] -top-40 -left-40 pointer-events-none"></div>
      <div className="absolute w-[400px] h-[400px] rounded-full bg-accent2/5 blur-[80px] -bottom-40 -right-40 pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-radius p-8 shadow-soft-shadow relative z-10 transition-all duration-300">
        <div className="text-center mb-8">
          <div className="font-syne text-4xl font-extrabold tracking-wider text-text mb-2">
            PPS<span className="text-accent">.</span>
          </div>
          <div className="text-muted text-xs uppercase tracking-widest font-mono">
            Personal Performance System
          </div>
        </div>

        {/* Status / Errors Alerts */}
        {(localError || authError) && (
          <div className="mb-4 p-3 rounded-radius-sm bg-red/10 border border-red/20 text-red text-xs font-mono">
            ⚠️ {localError || authError}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-radius-sm bg-green/10 border border-green/20 text-green text-xs font-mono">
            ✓ {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">Display Name</label>
              <input
                type="text"
                placeholder="e.g. Apex Performer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-sm w-full"
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">Email Address</label>
            <input
              type="email"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-sm w-full"
              disabled={!supabaseActive}
              required={supabaseActive}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-sm w-full"
              disabled={!supabaseActive}
              required={supabaseActive}
            />
          </div>

          {supabaseActive && (
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-accent to-accent2 hover:opacity-90 text-white font-bold py-3 rounded-radius shadow-glow-accent hover:scale-[1.01] active:scale-[0.99] transition-all text-sm mt-6 flex justify-center items-center"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : isRegistering ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          )}
        </form>

        {supabaseActive && (
          <div className="flex justify-between items-center text-xs mt-4">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setLocalError(null);
              }}
              className="text-accent hover:text-accent2 transition-colors cursor-pointer"
            >
              {isRegistering ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
          <span className="relative bg-[#132237] px-3 text-xs text-muted font-mono">OR</span>
        </div>

        {/* Guest Mode Action */}
        <div className="space-y-4">
          {!supabaseActive && (
            <div className="text-xs text-muted text-center leading-relaxed">
              No database configuration detected. Enter a name to try out PPS offline in your browser:
            </div>
          )}
          {!isRegistering && !supabaseActive && (
            <input
              type="text"
              placeholder="Display Name (default: Guest)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-sm w-full text-center"
            />
          )}
          <button
            onClick={handleGuestMode}
            className="w-full bg-surface-2 hover:bg-surface border border-border hover:border-border-bright text-text-2 hover:text-text font-semibold py-3 rounded-radius transition-all text-sm"
          >
            🚀 Try Offline (Guest Mode)
          </button>
        </div>
      </div>
    </div>
  );
};
