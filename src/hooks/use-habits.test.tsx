import { describe, it, expect } from "vitest";
import { CONFIG } from "./use-habits";

describe("useHabits Configuration", () => {
  it("should have correct XP per completion", () => {
    expect(CONFIG.XP_PER_COMPLETION).toBe(10);
  });

  it("should have correct level XP threshold", () => {
    expect(CONFIG.LEVEL_XP_THRESHOLD).toBe(100);
  });

  it("should have correct max freeze credits", () => {
    expect(CONFIG.MAX_FREEZE_CREDITS).toBe(2);
  });
});

describe("XP and Level Calculations", () => {
  it("should calculate level correctly from XP", () => {
    const calculateLevel = (xp: number) => Math.floor(xp / CONFIG.LEVEL_XP_THRESHOLD) + 1;
    
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(50)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(150)).toBe(2);
    expect(calculateLevel(200)).toBe(3);
    expect(calculateLevel(1000)).toBe(11);
  });

  it("should calculate total XP from completions", () => {
    const calculateTotalXP = (completions: number) => completions * CONFIG.XP_PER_COMPLETION;
    
    expect(calculateTotalXP(0)).toBe(0);
    expect(calculateTotalXP(1)).toBe(10);
    expect(calculateTotalXP(5)).toBe(50);
    expect(calculateTotalXP(10)).toBe(100);
  });
});
