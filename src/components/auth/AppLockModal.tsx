import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Fingerprint, Delete, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AppLockModalProps {
  isOpen: boolean;
  /** Verify the entered PIN (or complete unlock after biometrics). Resolves true when unlocked. */
  onUnlock: (pin?: string) => Promise<boolean>;
  /** Notify the parent once the lock has been lifted (parent sets isOpen=false). */
  onUnlocked?: () => void;
  /** Trigger the native FaceID / fingerprint prompt. Resolves true on success. */
  onBiometricPrompt: () => Promise<boolean>;
  /** Whether the device supports biometric authentication. */
  hasBiometrics: boolean;
}

const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

const SHAKE_KEYFRAMES = [0, -12, 12, -8, 8, 0];

/**
 * Full-screen biometric + PIN lock overlay.
 *
 * Security-sensitive UI only: it never stores or logs the PIN, it delegates all
 * verification to the parent via `onUnlock` / `onBiometricPrompt`, enforces a
 * visible lockout countdown after repeated failures, traps focus inside the lock,
 * and notifies the parent via `onUnlocked` once unlocked.
 */
export function AppLockModal({
  isOpen,
  onUnlock,
  onUnlocked,
  onBiometricPrompt,
  hasBiometrics,
}: AppLockModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [justUnlocked, setJustUnlocked] = useState(false);

  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Refs keep async handlers stable and prevent double-submits / stale closures.
  const onUnlockRef = useRef(onUnlock);
  const onUnlockedRef = useRef(onUnlocked);
  const onBiometricRef = useRef(onBiometricPrompt);
  const submittingRef = useRef(false);
  const biometricPendingRef = useRef(false);
  const failedRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onUnlockRef.current = onUnlock;
    onUnlockedRef.current = onUnlocked;
    onBiometricRef.current = onBiometricPrompt;
  }, [onUnlock, onUnlocked, onBiometricPrompt]);

  const isLockedOut = lockoutUntil !== null && nowTick < lockoutUntil;
  const lockoutRemaining = lockoutUntil ? Math.max(0, Math.ceil((lockoutUntil - nowTick) / 1000)) : 0;

  // Reset transient entry state whenever the lock is (re)opened. The lockout timer
  // intentionally persists across re-opens so it cannot be bypassed by closing.
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError(null);
      setJustUnlocked(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [isOpen]);

  // Focus trap: prevent Tab from leaving the lock screen while it is open.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = inputRef.current;
      if (!focusable) return;
      e.preventDefault();
      focusable.focus();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lockout countdown ticker.
  useEffect(() => {
    if (!lockoutUntil) return;
    setNowTick(Date.now());
    const id = setInterval(() => {
      const t = Date.now();
      setNowTick(t);
      if (t >= lockoutUntil) {
        setLockoutUntil(null);
        failedRef.current = 0;
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  const triggerShake = useCallback(() => {
    setShakeKey((k) => k + 1);
  }, []);

  const fireUnlocked = useCallback(() => {
    setJustUnlocked(true);
    void onUnlockedRef.current?.();
  }, []);

  const submitPin = useCallback(
    async (value: string) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setError(null);
      try {
        const ok = await onUnlockRef.current(value);
        if (ok) {
          fireUnlocked();
          return;
        }
        // Failed attempt
        const next = failedRef.current + 1;
        setPin("");
        triggerShake();
        if (next >= MAX_ATTEMPTS) {
          failedRef.current = 0;
          setLockoutUntil(Date.now() + LOCKOUT_SECONDS * 1000);
          setNowTick(Date.now());
          setError(null);
        } else {
          failedRef.current = next;
          setError("Incorrect PIN");
        }
      } catch {
        setPin("");
        setError("Could not verify PIN");
        triggerShake();
      } finally {
        submittingRef.current = false;
      }
    },
    [triggerShake, fireUnlocked]
  );

  // Auto-submit once the PIN is complete.
  useEffect(() => {
    if (pin.length === PIN_LENGTH && !isLockedOut && !submittingRef.current) {
      void submitPin(pin);
    }
  }, [pin, isLockedOut, submitPin]);

  const addDigit = useCallback(
    (digit: string) => {
      if (isLockedOut || submittingRef.current || justUnlocked) return;
      setError(null);
      setPin((prev) => (prev.length >= PIN_LENGTH ? prev : prev + digit));
    },
    [isLockedOut, justUnlocked]
  );

  const handleBackspace = useCallback(() => {
    if (isLockedOut || justUnlocked) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }, [isLockedOut, justUnlocked]);

  const handleClear = useCallback(() => {
    if (isLockedOut || justUnlocked) return;
    setError(null);
    setPin("");
  }, [isLockedOut, justUnlocked]);

  const handleBiometric = useCallback(async () => {
    if (isLockedOut || biometricPendingRef.current || justUnlocked) return;
    biometricPendingRef.current = true;
    setError(null);
    try {
      const ok = await onBiometricRef.current();
      if (ok) {
        // Biometrics verified -> delegate final unlock decision to the parent
        // via onUnlock() with no PIN (biometric path).
        const unlocked = await onUnlockRef.current();
        if (unlocked) {
          fireUnlocked();
        } else {
          setError("Biometric authentication failed");
          triggerShake();
        }
      } else {
        setError("Biometric authentication failed");
        triggerShake();
      }
    } catch {
      setError("Biometric authentication failed");
      triggerShake();
    } finally {
      biometricPendingRef.current = false;
    }
  }, [isLockedOut, justUnlocked, triggerShake, fireUnlocked]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
      setPin(digitsOnly);
      // Keep the hidden input in sync so paste stays capped at PIN_LENGTH.
      e.target.value = digitsOnly;
    },
    []
  );

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-testid="app-lock-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="App Locked"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/85 backdrop-blur-xl p-4"
        >
          <motion.div
            initial={{ scale: 0.94, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl"
          >
            {justUnlocked ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3" data-testid="lock-success">
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500"
                >
                  <CheckCircle2 className="h-9 w-9" />
                </motion.div>
                <p className="text-sm font-semibold text-foreground">Unlocked</p>
                <p className="text-xs text-muted-foreground">Welcome back to your flow.</p>
              </div>
            ) : (
              <>
                {/* Off-screen numeric input for mobile paste / keyboard entry. */}
                <input
                  ref={inputRef}
                  data-testid="paste-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={PIN_LENGTH}
                  value={pin}
                  onChange={handleInputChange}
                  tabIndex={-1}
                  className="sr-only fixed -top-4 -left-4 w-1 h-1 p-0 border-0 opacity-0 pointer-events-none"
                />

                {/* Header */}
                <div className="flex flex-col items-center text-center gap-2 mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary border border-primary/20">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">App Locked</h2>
                  <p className="text-xs text-muted-foreground">
                    {isLockedOut ? "Too many attempts. Please wait." : "Enter your PIN to continue"}
                  </p>
                </div>

                {/* PIN slots (shake target) */}
                <motion.div
                  key={shakeKey}
                  data-testid="pin-area"
                  data-shake={shakeKey}
                  initial={false}
                  animate={{ x: shakeKey > 0 ? SHAKE_KEYFRAMES : 0 }}
                  transition={{ duration: 0.4 }}
                  aria-live="polite"
                  className="flex items-center justify-center gap-3 mb-5"
                >
                  {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                    <span
                      key={i}
                      data-testid="pin-slot"
                      data-filled={i < pin.length}
                      className={cn(
                        "h-3.5 w-3.5 rounded-full border transition-all duration-150",
                        i < pin.length
                          ? "bg-primary border-primary scale-110"
                          : "bg-transparent border-border"
                      )}
                    />
                  ))}
                </motion.div>

                {/* Error / lockout message */}
                {isLockedOut ? (
                  <div
                    data-testid="lockout-countdown"
                    className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive"
                  >
                    <Lock className="h-4 w-4" />
                    <span className="text-xs font-bold font-mono">
                      Locked · {lockoutRemaining}s
                    </span>
                  </div>
                ) : (
                  error && (
                    <p role="alert" data-testid="lock-error" className="mb-4 text-center text-xs font-semibold text-destructive">
                      {error}
                    </p>
                  )
                )}

                {/* Keypad */}
                {!isLockedOut && (
                  <div data-testid="keypad" className="select-none">
                    {hasBiometrics && (
                      <Button
                        type="button"
                        variant="outline"
                        data-testid="biometric-button"
                        onClick={handleBiometric}
                        className="mb-3 w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Fingerprint className="h-4 w-4" />
                        <span>Use Biometrics</span>
                      </Button>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      {digits.map((d) => (
                        <Button
                          key={d}
                          type="button"
                          variant="ghost"
                          data-testid={`key-${d}`}
                          aria-label={`Digit ${d}`}
                          onClick={() => addDigit(d)}
                          className="h-12 rounded-xl text-lg font-bold text-foreground hover:bg-accent"
                        >
                          {d}
                        </Button>
                      ))}

                      <Button
                        type="button"
                        variant="ghost"
                        data-testid="key-clear"
                        aria-label="Clear PIN"
                        onClick={handleClear}
                        className="h-12 rounded-xl text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent"
                      >
                        Clear
                      </Button>
                      <Button
                        key="0"
                        type="button"
                        variant="ghost"
                        data-testid="key-0"
                        aria-label="Digit 0"
                        onClick={() => addDigit("0")}
                        className="h-12 rounded-xl text-lg font-bold text-foreground hover:bg-accent"
                      >
                        0
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        data-testid="key-backspace"
                        aria-label="Backspace"
                        onClick={handleBackspace}
                        className="h-12 rounded-xl text-muted-foreground hover:bg-accent"
                      >
                        <Delete className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Secured with on-device encryption</span>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}