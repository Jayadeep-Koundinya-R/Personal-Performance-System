import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { App, AppState } from "@capacitor/app";

const STORAGE_KEYS = {
  ENABLED: "pps_app_lock_enabled",
  PIN_HASH: "pps_app_lock_pin_hash",
  BIOMETRICS_ENABLED: "pps_app_lock_biometrics_enabled",
  LAST_BACKGROUND: "pps_app_lock_last_bg",
  FAILED_ATTEMPTS: "pps_app_lock_failed_attempts",
  LOCKOUT_UNTIL: "pps_app_lock_lockout_until",
  TIMEOUT_MS: "pps_app_lock_timeout_ms",
};

const DEFAULT_AUTO_LOCK_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds penalty

// Native Web Crypto SHA-256 helper
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface AppLockContextValue {
  isLocked: boolean;
  isLockEnabled: boolean;
  hasBiometrics: boolean;
  timeoutMs: number;
  setTimeoutDuration: (ms: number) => void;
  failedAttempts: number;
  lockoutRemainingSec: number;
  unlockWithPin: (pin?: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  enableLock: (pin: string) => Promise<void>;
  disableLock: (currentPin: string) => Promise<boolean>;
  lockApp: () => void;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

export const AppLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLockEnabled, setIsLockEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ENABLED) === "true";
    } catch {
      return false;
    }
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      const enabled = localStorage.getItem(STORAGE_KEYS.ENABLED) === "true";
      const hasPin = Boolean(localStorage.getItem(STORAGE_KEYS.PIN_HASH));
      return enabled && hasPin;
    } catch {
      return false;
    }
  });

  const [hasBiometrics, setHasBiometrics] = useState<boolean>(false);
  const [timeoutMs, setTimeoutMsState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TIMEOUT_MS);
      return saved ? parseInt(saved, 10) : DEFAULT_AUTO_LOCK_TIMEOUT_MS;
    } catch {
      return DEFAULT_AUTO_LOCK_TIMEOUT_MS;
    }
  });

  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS) || "0", 10);
    } catch {
      return 0;
    }
  });

  const [lockoutRemainingSec, setLockoutRemainingSec] = useState<number>(0);

  // Global event listener to keep all components in sync
  useEffect(() => {
    const handleGlobalLock = () => setIsLocked(true);
    const handleGlobalUnlock = () => setIsLocked(false);
    window.addEventListener("pps_app_lock", handleGlobalLock);
    window.addEventListener("pps_app_unlock", handleGlobalUnlock);
    return () => {
      window.removeEventListener("pps_app_lock", handleGlobalLock);
      window.removeEventListener("pps_app_unlock", handleGlobalUnlock);
    };
  }, []);

  // Check device biometric capability (PublicKeyCredential / WebAuthn / Capacitor)
  useEffect(() => {
    async function checkBiometrics() {
      try {
        if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setHasBiometrics(available);
        } else {
          setHasBiometrics(false);
        }
      } catch {
        setHasBiometrics(false);
      }
    }
    checkBiometrics();
  }, []);

  // Check lockout countdown
  useEffect(() => {
    const checkLockout = () => {
      try {
        const lockoutUntilStr = localStorage.getItem(STORAGE_KEYS.LOCKOUT_UNTIL);
        if (lockoutUntilStr) {
          const lockoutUntil = parseInt(lockoutUntilStr, 10);
          const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
          setLockoutRemainingSec(remaining);
          if (remaining === 0) {
            localStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
            localStorage.removeItem(STORAGE_KEYS.FAILED_ATTEMPTS);
            setFailedAttempts(0);
          }
        } else {
          setLockoutRemainingSec(0);
        }
      } catch {}
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  // Capacitor Native AppState listener for background auto-lock
  useEffect(() => {
    if (!isLockEnabled) return;

    let appListenerHandle: any = null;

    const handleStateChange = (state: AppState) => {
      if (!state.isActive) {
        // App went to background
        const now = Date.now();
        localStorage.setItem(STORAGE_KEYS.LAST_BACKGROUND, String(now));
      } else {
        // App resumed to foreground
        const lastBgStr = localStorage.getItem(STORAGE_KEYS.LAST_BACKGROUND);
        if (lastBgStr) {
          const lastBg = parseInt(lastBgStr, 10);
          const elapsed = Date.now() - lastBg;
          if (elapsed >= timeoutMs) {
            setIsLocked(true);
            window.dispatchEvent(new CustomEvent("pps_app_lock"));
          }
        }
      }
    };

    // Attach native Capacitor listener
    App.addListener("appStateChange", handleStateChange).then((handle) => {
      appListenerHandle = handle;
    });

    // Web visibilitychange fallback for browser testing
    const handleVisibilityChange = () => {
      if (document.hidden) {
        localStorage.setItem(STORAGE_KEYS.LAST_BACKGROUND, String(Date.now()));
      } else {
        const lastBgStr = localStorage.getItem(STORAGE_KEYS.LAST_BACKGROUND);
        if (lastBgStr) {
          const elapsed = Date.now() - parseInt(lastBgStr, 10);
          if (elapsed >= timeoutMs) {
            setIsLocked(true);
            window.dispatchEvent(new CustomEvent("pps_app_lock"));
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (appListenerHandle && typeof appListenerHandle.remove === "function") {
        appListenerHandle.remove();
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLockEnabled, timeoutMs]);

  // Lock the app immediately
  const lockApp = useCallback(() => {
    setIsLocked(true);
    window.dispatchEvent(new CustomEvent("pps_app_lock"));
  }, []);

  // Unlock with PIN (or pre-verified biometric if pin is undefined)
  const unlockWithPin = useCallback(async (pin?: string): Promise<boolean> => {
    try {
      if (lockoutRemainingSec > 0) return false;

      // When called with no PIN (e.g. biometric prompt succeeded in AppLockModal), unlock immediately
      if (pin === undefined) {
        setIsLocked(false);
        setFailedAttempts(0);
        localStorage.removeItem(STORAGE_KEYS.FAILED_ATTEMPTS);
        localStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
        window.dispatchEvent(new CustomEvent("pps_app_unlock"));
        return true;
      }

      const storedHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH);
      if (!storedHash) {
        // No PIN configured
        setIsLocked(false);
        window.dispatchEvent(new CustomEvent("pps_app_unlock"));
        return true;
      }

      const inputHash = await hashPin(pin);
      if (inputHash === storedHash) {
        setIsLocked(false);
        setFailedAttempts(0);
        localStorage.removeItem(STORAGE_KEYS.FAILED_ATTEMPTS);
        localStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
        window.dispatchEvent(new CustomEvent("pps_app_unlock"));
        return true;
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        localStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, String(newAttempts));

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
          localStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, String(lockoutUntil));
          setLockoutRemainingSec(Math.ceil(LOCKOUT_DURATION_MS / 1000));
        }
        return false;
      }
    } catch {
      return false;
    }
  }, [failedAttempts, lockoutRemainingSec]);

  // Unlock with Biometrics
  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      if (lockoutRemainingSec > 0) return false;
      setIsLocked(false);
      setFailedAttempts(0);
      localStorage.removeItem(STORAGE_KEYS.FAILED_ATTEMPTS);
      window.dispatchEvent(new CustomEvent("pps_app_unlock"));
      return true;
    } catch {
      return false;
    }
  }, [lockoutRemainingSec]);

  // Setup / Enable App Lock
  const enableLock = useCallback(async (pin: string): Promise<void> => {
    const hashed = await hashPin(pin);
    localStorage.setItem(STORAGE_KEYS.PIN_HASH, hashed);
    localStorage.setItem(STORAGE_KEYS.ENABLED, "true");
    setIsLockEnabled(true);
    setIsLocked(false);
  }, []);

  // Disable App Lock
  const disableLock = useCallback(async (currentPin: string): Promise<boolean> => {
    const storedHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH);
    if (!storedHash) {
      localStorage.removeItem(STORAGE_KEYS.ENABLED);
      setIsLockEnabled(false);
      setIsLocked(false);
      return true;
    }

    const inputHash = await hashPin(currentPin);
    if (inputHash === storedHash) {
      localStorage.removeItem(STORAGE_KEYS.ENABLED);
      localStorage.removeItem(STORAGE_KEYS.PIN_HASH);
      localStorage.removeItem(STORAGE_KEYS.FAILED_ATTEMPTS);
      localStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
      setIsLockEnabled(false);
      setIsLocked(false);
      return true;
    }
    return false;
  }, []);

  const setTimeoutDuration = useCallback((ms: number) => {
    localStorage.setItem(STORAGE_KEYS.TIMEOUT_MS, String(ms));
    setTimeoutMsState(ms);
  }, []);

  const value = {
    isLocked,
    isLockEnabled,
    hasBiometrics,
    timeoutMs,
    setTimeoutDuration,
    failedAttempts,
    lockoutRemainingSec,
    unlockWithPin,
    unlockWithBiometrics,
    enableLock,
    disableLock,
    lockApp,
  };

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
};

export function useAppLock(): AppLockContextValue {
  const context = useContext(AppLockContext);
  if (context) {
    return context;
  }

  // Fallback for tests or components rendered without provider: dispatch global events
  const isEnabled = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEYS.ENABLED) === "true";
  const hasPin = typeof window !== "undefined" && Boolean(localStorage.getItem(STORAGE_KEYS.PIN_HASH));

  return {
    isLocked: isEnabled && hasPin,
    isLockEnabled: isEnabled,
    hasBiometrics: false,
    timeoutMs: DEFAULT_AUTO_LOCK_TIMEOUT_MS,
    setTimeoutDuration: (ms: number) => localStorage.setItem(STORAGE_KEYS.TIMEOUT_MS, String(ms)),
    failedAttempts: 0,
    lockoutRemainingSec: 0,
    unlockWithPin: async (pin?: string) => {
      window.dispatchEvent(new CustomEvent("pps_app_unlock"));
      return true;
    },
    unlockWithBiometrics: async () => {
      window.dispatchEvent(new CustomEvent("pps_app_unlock"));
      return true;
    },
    enableLock: async (pin: string) => {
      const hashed = await hashPin(pin);
      localStorage.setItem(STORAGE_KEYS.PIN_HASH, hashed);
      localStorage.setItem(STORAGE_KEYS.ENABLED, "true");
    },
    disableLock: async (pin: string) => {
      localStorage.removeItem(STORAGE_KEYS.ENABLED);
      return true;
    },
    lockApp: () => {
      window.dispatchEvent(new CustomEvent("pps_app_lock"));
    },
  };
}
