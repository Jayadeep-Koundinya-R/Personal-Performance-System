import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { useHabits } from "@/hooks/use-habits";
import { DashboardProviders } from "@/providers/AppProviders";

describe("Core E2E User Journey & System Lifecycle Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const guestUser = {
    id: "guest_e2e",
    email: "e2e@pps.local",
    isGuest: true,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DashboardProviders user={guestUser}>
      {children}
    </DashboardProviders>
  );

  it("completes full user lifecycle: create habits → complete daily tasks → compute streak/XP → audit analytics → backup export & import", async () => {
    // ── Phase 1: Initialize System & Hook State ──
    const { result } = renderHook(() => useHabits(), { wrapper });

    expect(result.current.habits).toBeDefined();
    const initialCount = result.current.habits.length;

    // ── Phase 2: Create Custom Habits Across Diverse Categories ──
    const todayDateStr = result.current.getTodayStr();
    let createdHabit1Id: string | null = null;
    let createdHabit2Id: string | null = null;

    await act(async () => {
      createdHabit1Id = await result.current.addHabit(
        "Morning Deep Work Sprint",
        "Productivity",
        "Daily",
        "High",
        todayDateStr,
        "09:00",
        "10:00"
      );
    });

    const habit1 = result.current.habits.find((h) => h.name === "Morning Deep Work Sprint");
    expect(habit1).toBeDefined();
    expect(habit1?.category).toBe("Productivity");
    expect(habit1?.priority).toBe("High");

    await act(async () => {
      createdHabit2Id = await result.current.addHabit(
        "Algorithms & NCERT Reading",
        "Learning",
        "Daily",
        "Medium",
        todayDateStr,
        "14:00",
        "15:00"
      );
    });

    const habit2 = result.current.habits.find((h) => h.name === "Algorithms & NCERT Reading");
    expect(habit2).toBeDefined();
    expect(habit2?.category).toBe("Learning");

    expect(result.current.habits.length).toBe(initialCount + 2);

    // ── Phase 3: Complete Habits & Verify Dynamic Streak & XP Calculation ──
    const todayStr = result.current.getTodayStr();

    await act(async () => {
      await result.current.toggleCompletion(habit1!.id, todayStr);
    });

    const updatedHabit1 = result.current.habits.find((h) => h.id === habit1!.id);
    expect(updatedHabit1?.completedDates).toContain(todayStr);

    await act(async () => {
      await result.current.toggleCompletion(habit2!.id, todayStr);
    });

    const updatedHabit2 = result.current.habits.find((h) => h.id === habit2!.id);
    expect(updatedHabit2?.completedDates).toContain(todayStr);

    // Verify streak and XP rewards
    expect(updatedHabit1?.streak).toBeGreaterThanOrEqual(1);

    const totalXP = result.current.calculateTotalXP();
    expect(totalXP).toBeGreaterThanOrEqual(20); // 10 XP per habit completion

    const currentLevel = result.current.calculateLevel();
    expect(currentLevel).toBeGreaterThanOrEqual(1);

    // ── Phase 4: Analytics Metrics Computation ──
    const maxStreak = result.current.getMaxStreak();
    expect(maxStreak).toBeGreaterThanOrEqual(1);

    const completedTodayCount = result.current.habits.filter((h) =>
      h.completedDates.includes(todayStr)
    ).length;
    expect(completedTodayCount).toBeGreaterThanOrEqual(2);

    // ── Phase 5: Data Vault Export & Schema Verification ──
    const exportPayload = {
      version: "2.0",
      timestamp: new Date().toISOString(),
      habits: result.current.habits,
      totalXP,
      level: currentLevel,
      maxStreak,
    };

    expect(exportPayload.habits.length).toBeGreaterThanOrEqual(2);

    const exportedJson = JSON.stringify(exportPayload);
    expect(exportedJson).toContain("Morning Deep Work Sprint");
    expect(exportedJson).toContain("Algorithms & NCERT Reading");

    // ── Phase 6: Restore / Import Verification ──
    localStorage.clear();
    const parsedBackup = JSON.parse(exportedJson);
    expect(parsedBackup.habits.length).toBe(exportPayload.habits.length);
    expect(parsedBackup.totalXP).toBe(totalXP);
    expect(parsedBackup.maxStreak).toBe(maxStreak);

    // Restore to localStorage
    localStorage.setItem(`habits_${guestUser.email}`, JSON.stringify(parsedBackup.habits));

    const { result: restoredResult } = renderHook(() => useHabits(), { wrapper });
    expect(restoredResult.current.habits.find((h) => h.id === habit1!.id)).toBeDefined();
    expect(restoredResult.current.calculateTotalXP()).toBe(totalXP);
  });
});
