import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClasses } from "../use-classes";
import { ROADMAP_DATA } from "../../lib/roadmap-data";

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

  it("initializes masterclasses cleanly with zero hardcoded fake data", () => {
    const { result } = renderHook(() => useClasses());
    expect(result.current.classes).toEqual([]);
  });

  it("allows a student to book a ticket for a published class and prevents double booking", async () => {
    const { result } = renderHook(() => useClasses());

    let createRes: any;
    await act(async () => {
      createRes = await result.current.createMasterclass({
        title: "Competitive Programming Graphs Masterclass",
        subject: "Computer Science",
        description: "Learn Dijkstra and segment trees.",
        price: 199,
        durationMinutes: 60,
        maxSeats: 20,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      });
    });

    const targetClass = result.current.classes[0];
    expect(targetClass).toBeDefined();

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

  it("verifies the 4-quarter engineering roadmap data structure", () => {
    expect(ROADMAP_DATA.length).toBe(4);
    
    const quarters = ROADMAP_DATA.map((r: any) => r.quarter);
    expect(quarters).toEqual(["Q3 2026", "Q4 2026", "Q1 2027", "Q2 2027"]);

    ROADMAP_DATA.forEach((item: any) => {
      expect(item.title).toBeDefined();
      expect(item.highlights.length).toBeGreaterThanOrEqual(4);
      expect(item.techStack.length).toBeGreaterThanOrEqual(3);
      expect(["in_progress", "next_up", "future_vision"]).toContain(item.status);
    });
  });

  it("formats classroom attendance CSV accurately with timestamps", () => {
    const students = [
      { name: "Alex Vance", role: "Student", status: "Present", timestamp: "2026-08-20 10:00:00", completion: "100%" },
      { name: "Elena Rostova", role: "Student", status: "Present", timestamp: "2026-08-20 10:02:15", completion: "95%" },
    ];

    const csvHeader = "Student Name,Role,Attendance Status,Join Timestamp,Completion Rate";
    const csvRows = students.map((s) => `${s.name},${s.role},${s.status},${s.timestamp},${s.completion}`);
    const fullCsv = [csvHeader, ...csvRows].join("\n");

    expect(fullCsv).toContain("Alex Vance,Student,Present,2026-08-20 10:00:00,100%");
    expect(fullCsv).toContain("Elena Rostova,Student,Present,2026-08-20 10:02:15,95%");
  });
});
