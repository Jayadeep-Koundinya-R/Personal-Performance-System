import { describe, it, expect, beforeEach } from "vitest";

describe("Celebration Timing & Non-Spam Milestone Engine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("prevents celebration popup on initial mount/refresh when historical badges exist", () => {
    const userId = "test_user_mount";
    const seenBadgeKey = `pps_seen_badge_count_${userId}`;
    const seenLevelKey = `pps_seen_level_${userId}`;

    // Simulate existing historical badges & level
    const initialBadgeCount = 4;
    const initialLevel = 3;

    // First mount logic
    let isInitialized = false;
    let celebrationTriggered = false;
    let prevBadgeCount = 0;
    let prevLevel = 0;

    function handleHydration(currentBadges: number, currentLvl: number) {
      if (!isInitialized) {
        let savedSeenBadges = currentBadges;
        let savedSeenLevel = currentLvl;

        const storedBadgeCount = localStorage.getItem(seenBadgeKey);
        if (storedBadgeCount !== null) {
          savedSeenBadges = Math.max(Number(storedBadgeCount), currentBadges);
        }
        const storedLevel = localStorage.getItem(seenLevelKey);
        if (storedLevel !== null) {
          savedSeenLevel = Math.max(Number(storedLevel), currentLvl);
        }
        localStorage.setItem(seenBadgeKey, String(savedSeenBadges));
        localStorage.setItem(seenLevelKey, String(savedSeenLevel));

        prevBadgeCount = savedSeenBadges;
        prevLevel = savedSeenLevel;
        isInitialized = true;
        return; // Zero celebration on initial mount!
      }

      if (currentBadges > prevBadgeCount) {
        celebrationTriggered = true;
        prevBadgeCount = currentBadges;
        localStorage.setItem(seenBadgeKey, String(currentBadges));
      }
      if (currentLvl > prevLevel) {
        celebrationTriggered = true;
        prevLevel = currentLvl;
        localStorage.setItem(seenLevelKey, String(currentLvl));
      }
    }

    // 1. Mount with existing badges
    handleHydration(initialBadgeCount, initialLevel);
    expect(celebrationTriggered).toBe(false);
    expect(prevBadgeCount).toBe(4);
    expect(prevLevel).toBe(3);

    // 2. Refresh simulation (mount again with same state)
    isInitialized = false;
    handleHydration(initialBadgeCount, initialLevel);
    expect(celebrationTriggered).toBe(false);

    // 3. User actively completes a habit in the session and earns a 5th badge
    handleHydration(5, initialLevel);
    expect(celebrationTriggered).toBe(true);
    expect(localStorage.getItem(seenBadgeKey)).toBe("5");
  });
});
