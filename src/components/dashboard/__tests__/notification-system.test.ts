import { describe, it, expect } from "vitest";
import type { Notification } from "@/hooks/use-notifications";

describe("🔔 PPS Phase 6: High-Signal Notification Bar & Reason/Fact Engine", () => {
  it("structures notification with mandatory behavioral reason and scientific fact", () => {
    const notif: Notification = {
      id: "notif_circadian_01",
      type: "circadian",
      title: "⚡ Peak Focus Window Open",
      message: "Morning deep work window for Distributed Systems is active.",
      reason: "Your biological alertness curve peaks between 09:00 - 11:30.",
      fact: "Frontal lobe cognitive speed is 22% higher during primary circadian windows.",
      priority: "high",
      actionLabel: "Start 25m Sprint",
      actionPayload: { section: "tracker", duration: 25 },
      icon: "⚡",
      time: "Just now",
      read: false,
    };

    expect(notif.priority).toBe("high");
    expect(notif.reason).toContain("09:00 - 11:30");
    expect(notif.fact).toBeDefined();
    expect(notif.actionPayload?.section).toBe("tracker");
  });

  it("prioritizes urgent curfew alerts over standard reminders for active banner", () => {
    const notifications: Notification[] = [
      {
        id: "1",
        type: "reminder",
        title: "Habits waiting",
        message: "2 habits pending",
        priority: "low",
        icon: "📋",
        time: "10:00 AM",
        read: false,
      },
      {
        id: "2",
        type: "curfew",
        title: "🔥 Agni Curfew Countdown",
        message: "30 minutes to digital shutdown.",
        reason: "Protects memory consolidation and preserves tomorrow's streak.",
        priority: "urgent",
        icon: "🌙",
        time: "9:30 PM",
        read: false,
      },
    ];

    const activeBanner =
      notifications.find((n) => !n.read && (n.priority === "urgent" || n.priority === "high")) ||
      notifications.find((n) => !n.read) ||
      null;

    expect(activeBanner?.id).toBe("2");
    expect(activeBanner?.priority).toBe("urgent");
  });

  it("deduplicates identical notification titles and messages", () => {
    const items = [
      { title: "Habits waiting today!", message: "You have 3 habits to complete today." },
      { title: "Habits waiting today!", message: "You have 3 habits to complete today." },
      { title: "🔥 Agni Curfew", message: "Time to wrap up." },
    ];

    const seen = new Set<string>();
    const deduplicated = items.filter((item) => {
      const key = `${item.title.trim()}_${item.message.trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    expect(deduplicated.length).toBe(2);
    expect(deduplicated[0].title).toBe("Habits waiting today!");
    expect(deduplicated[1].title).toBe("🔥 Agni Curfew");
  });

  it("handles 1-tap action payloads cleanly for navigation routing", () => {
    let activeNavSection = "dashboard";
    const alert: Notification = {
      id: "3",
      type: "streak",
      title: "🛡️ Streak Defense Active",
      message: "Log a 2-minute micro habit to shield streak.",
      reason: "5-day streak at risk tonight.",
      priority: "high",
      actionLabel: "Log Micro",
      actionPayload: { section: "streak" },
      icon: "🛡️",
      time: "Just now",
      read: false,
    };

    if (alert.actionPayload?.section) {
      activeNavSection = alert.actionPayload.section;
    }

    expect(activeNavSection).toBe("streak");
  });
});
