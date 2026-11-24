import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { AppLockProvider, useAppLock } from "../use-app-lock";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppLockProvider>{children}</AppLockProvider>
);

describe("Phase 1.5 Biometric App Lock & Auto-Lock Hook", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("initializes with lock disabled by default", () => {
    const { result } = renderHook(() => useAppLock(), { wrapper });
    expect(result.current.isLockEnabled).toBe(false);
    expect(result.current.isLocked).toBe(false);
    expect(result.current.failedAttempts).toBe(0);
  });

  it("enables lock and persists SHA-256 PIN hash", async () => {
    const { result } = renderHook(() => useAppLock(), { wrapper });

    await act(async () => {
      await result.current.enableLock("1234");
    });

    expect(result.current.isLockEnabled).toBe(true);
    expect(result.current.isLocked).toBe(false);
    expect(localStorage.getItem("pps_app_lock_enabled")).toBe("true");
    expect(localStorage.getItem("pps_app_lock_pin_hash")).toBeTruthy();
  });

  it("successfully unlocks with correct PIN", async () => {
    const { result } = renderHook(() => useAppLock(), { wrapper });

    await act(async () => {
      await result.current.enableLock("4321");
    });

    act(() => {
      result.current.lockApp();
    });
    expect(result.current.isLocked).toBe(true);

    let success = false;
    await act(async () => {
      success = await result.current.unlockWithPin("4321");
    });

    expect(success).toBe(true);
    expect(result.current.isLocked).toBe(false);
    expect(result.current.failedAttempts).toBe(0);
  });

  it("increments failed attempts and denies unlock on incorrect PIN", async () => {
    const { result } = renderHook(() => useAppLock(), { wrapper });

    await act(async () => {
      await result.current.enableLock("9999");
    });

    act(() => {
      result.current.lockApp();
    });

    let success = true;
    await act(async () => {
      success = await result.current.unlockWithPin("0000");
    });

    expect(success).toBe(false);
    expect(result.current.isLocked).toBe(true);
    expect(result.current.failedAttempts).toBe(1);
  });

  it("disables lock when verified with current PIN", async () => {
    const { result } = renderHook(() => useAppLock(), { wrapper });

    await act(async () => {
      await result.current.enableLock("1111");
    });

    let disabled = false;
    await act(async () => {
      disabled = await result.current.disableLock("1111");
    });

    expect(disabled).toBe(true);
    expect(result.current.isLockEnabled).toBe(false);
    expect(result.current.isLocked).toBe(false);
    expect(localStorage.getItem("pps_app_lock_enabled")).toBeNull();
  });
});
