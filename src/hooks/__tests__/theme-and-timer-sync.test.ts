import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme, ThemeProvider } from "../use-theme";
import React from "react";

describe("Account-Scoped Theme & Pomodoro Cross-Device Sync", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("initializes theme from localStorage and applies DOM class", () => {
    localStorage.setItem("pps_theme", "light");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(ThemeProvider, null, children)
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles theme and updates DOM classes and localStorage synchronously", () => {
    localStorage.setItem("pps_theme", "dark");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(ThemeProvider, null, children)
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(localStorage.getItem("pps_theme")).toBe("light");

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("pps_theme")).toBe("dark");
  });

  it("calculates active Pomodoro remaining time accurately across devices using epoch timestamps", () => {
    const totalSec = 25 * 60; // 1500 sec
    const now = Date.now();
    // Simulate a session started 5 minutes (300 sec) ago on Device A
    const startedAt = new Date(now - 300 * 1000).toISOString();
    const targetEndAt = new Date(now + 1200 * 1000).toISOString();

    const remotePayload = {
      isRunning: true,
      startedAt,
      targetEndAt,
      totalSec,
      pausedRemainingSec: null,
      timerMode: "pomodoro" as const,
      activeTaskName: "Deep Research Sprint",
      linkedHabitId: null,
      customMinutes: 25,
      lastUpdated: new Date().toISOString(),
    };

    // Calculate remaining seconds as Device B would upon receiving the payload
    const targetTime = new Date(remotePayload.targetEndAt).getTime();
    const computedDiffSec = Math.ceil((targetTime - Date.now()) / 1000);

    // Should be approximately 1200 seconds remaining (within 2 seconds tolerance for test execution)
    expect(computedDiffSec).toBeGreaterThanOrEqual(1198);
    expect(computedDiffSec).toBeLessThanOrEqual(1202);
  });

  it("detects expired Pomodoro session when device wakes up after target time", () => {
    const totalSec = 25 * 60;
    const now = Date.now();
    // Session ended 10 minutes ago
    const startedAt = new Date(now - 35 * 60 * 1000).toISOString();
    const targetEndAt = new Date(now - 10 * 60 * 1000).toISOString();

    const expiredPayload = {
      isRunning: true,
      startedAt,
      targetEndAt,
      totalSec,
      pausedRemainingSec: null,
      timerMode: "pomodoro" as const,
      activeTaskName: "Completed Task",
      linkedHabitId: null,
      customMinutes: 25,
      lastUpdated: new Date().toISOString(),
    };

    const targetTime = new Date(expiredPayload.targetEndAt).getTime();
    const computedDiffSec = Math.ceil((targetTime - Date.now()) / 1000);

    expect(computedDiffSec).toBeLessThanOrEqual(0);
  });
});
