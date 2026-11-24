import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  enqueueOfflineMutation,
  getOfflineQueue,
  removeOfflineMutation,
  clearOfflineQueue,
  getOfflineQueueCount,
  flushOfflineQueue,
  initOfflineSyncListener,
  OfflineMutation,
} from "../offlineQueue";

describe("Offline Mutation Sync Queue", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearOfflineQueue();
  });

  it("enqueues a habit completion mutation when offline", () => {
    const mutation = enqueueOfflineMutation("TOGGLE_HABIT", {
      habitId: "h-123",
      dateStr: "2026-11-15",
      completed: true,
      userId: "u-999",
    });

    expect(mutation.id).toBeDefined();
    expect(mutation.type).toBe("TOGGLE_HABIT");
    expect(mutation.retryCount).toBe(0);

    const queue = getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].payload.habitId).toBe("h-123");
  });

  it("counts pending offline mutations accurately", () => {
    expect(getOfflineQueueCount()).toBe(0);

    enqueueOfflineMutation("TOGGLE_HABIT", { habitId: "h-1" });
    enqueueOfflineMutation("LOG_FOCUS_SPRINT", { durationMinutes: 25 });

    expect(getOfflineQueueCount()).toBe(2);
  });

  it("removes a specific mutation by ID", () => {
    const m1 = enqueueOfflineMutation("TOGGLE_HABIT", { habitId: "h-1" });
    const m2 = enqueueOfflineMutation("TOGGLE_HABIT", { habitId: "h-2" });

    expect(getOfflineQueueCount()).toBe(2);
    removeOfflineMutation(m1.id);

    const queue = getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(m2.id);
  });

  it("clears the entire offline queue", () => {
    enqueueOfflineMutation("TOGGLE_HABIT", { habitId: "h-1" });
    enqueueOfflineMutation("TOGGLE_HABIT", { habitId: "h-2" });
    clearOfflineQueue();

    expect(getOfflineQueueCount()).toBe(0);
  });

  it("flushes mutations through custom replay handler and purges completed items", async () => {
    enqueueOfflineMutation("TOGGLE_HABIT", { habitId: "h-100", completed: true });
    enqueueOfflineMutation("LOG_FOCUS_SPRINT", { durationMinutes: 45 });

    const handler = vi.fn().mockResolvedValue(true);
    const result = await flushOfflineQueue(handler);

    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(getOfflineQueueCount()).toBe(0);
  });

  it("increments retry count on failed replay without losing mutation", async () => {
    enqueueOfflineMutation("TOGGLE_HABIT", { habitId: "fail-habit" });

    const failingHandler = vi.fn().mockResolvedValue(false);
    const result = await flushOfflineQueue(failingHandler);

    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);

    const queue = getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].retryCount).toBe(1);
  });

  it("registers online event listener to trigger flush", async () => {
    const handler = vi.fn().mockResolvedValue(true);
    const unsubscribe = initOfflineSyncListener(handler);

    enqueueOfflineMutation("TOGGLE_HABIT", { habitId: "auto-sync" });

    // Dispatch native 'online' window event
    window.dispatchEvent(new Event("online"));

    // Allow promise microtasks to run
    await new Promise((res) => setTimeout(res, 20));

    expect(handler).toHaveBeenCalled();
    unsubscribe();
  });
});
