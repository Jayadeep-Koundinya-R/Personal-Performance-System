import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClasses } from "../use-classes";

// Mock useAuth
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "user_test_student", email: "student@pps.app" },
    isLoggedIn: true,
    isGuest: false,
  }),
}));

// Mock useProfile
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    profile: {
      displayName: "Rohan Patel",
      avatarEmoji: "🚀",
      streak: 14,
      xp: 2200,
    },
  }),
}));

describe("PPS Masterclasses & Teacher Marketplace System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads default verified masterclasses cleanly", () => {
    const { result } = renderHook(() => useClasses());

    expect(result.current.classes.length).toBeGreaterThanOrEqual(3);
    const firstClass = result.current.classes[0];
    expect(firstClass.title).toBeDefined();
    expect(firstClass.price).toBeGreaterThanOrEqual(0);
    expect(firstClass.mentorName).toBeDefined();
  });

  it("allows a student to book a ticket and prevents double booking", async () => {
    const { result } = renderHook(() => useClasses());
    const targetClass = result.current.classes[0];

    let bookingRes: any;
    await act(async () => {
      bookingRes = await result.current.bookClassTicket(targetClass.id, "UPI");
    });

    expect(bookingRes.success).toBe(true);
    expect(result.current.myTickets).toContain(targetClass.id);

    // Try booking again
    let duplicateRes: any;
    await act(async () => {
      duplicateRes = await result.current.bookClassTicket(targetClass.id, "UPI");
    });

    expect(duplicateRes.success).toBe(false);
    expect(duplicateRes.error).toContain("already enrolled");
  });

  it("allows a verified mentor to publish a new masterclass", async () => {
    const { result } = renderHook(() => useClasses());

    let createRes: any;
    await act(async () => {
      createRes = await result.current.createMasterclass({
        title: "Competitive Programming Graphs & Trees Masterclass",
        subject: "Computer Science",
        description: "Learn Dijkstra, Floyd-Warshall and Segment trees with live coding.",
        price: 299,
        durationMinutes: 90,
        maxSeats: 25,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      });
    });

    expect(createRes.success).toBe(true);
    expect(createRes.classId).toBeDefined();

    const created = result.current.classes.find((c) => c.id === createRes.classId);
    expect(created).toBeDefined();
    expect(created?.title).toBe("Competitive Programming Graphs & Trees Masterclass");
    expect(created?.price).toBe(299);
    expect(created?.mentorName).toBe("Rohan Patel");
  });
});
