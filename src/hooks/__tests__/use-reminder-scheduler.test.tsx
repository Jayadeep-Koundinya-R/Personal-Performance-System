import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useReminderScheduler } from "../use-reminder-scheduler";

const mockAddNotification = vi.fn();

vi.mock("@/hooks/use-reminders", () => ({
  useReminders: () => ({
    reminders: [
      {
        id: "rem-1",
        label: "Hydration Check 💧",
        time: "12:00",
        repeat: "Daily",
        enabled: true,
        channel: "in_app",
        deliveryType: "notification",
      },
    ],
  }),
}));

vi.mock("@/hooks/use-habits", () => ({
  useHabits: () => ({
    habits: [],
    getTodayStr: () => "2026-08-08",
    isHabitDueToday: () => true,
  }),
}));

vi.mock("@/hooks/use-notifications", () => ({
  useNotifications: () => ({
    addNotification: mockAddNotification,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe("useReminderScheduler Hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T12:00:00"));
    mockAddNotification.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires notification when scheduled reminder time matches current time", () => {
    renderHook(() => useReminderScheduler());

    // Advance 10 seconds to trigger interval check
    vi.advanceTimersByTime(10_000);

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "🔔 Reminder",
        message: "Hydration Check 💧",
      })
    );
  });

  it("does NOT fire duplicate notification twice in the same minute", () => {
    renderHook(() => useReminderScheduler());

    // First interval tick
    vi.advanceTimersByTime(10_000);
    const countAfterFirst = mockAddNotification.mock.calls.length;

    // Second interval tick inside the same minute
    vi.advanceTimersByTime(10_000);
    const countAfterSecond = mockAddNotification.mock.calls.length;

    expect(countAfterSecond).toBe(countAfterFirst);
  });
});
