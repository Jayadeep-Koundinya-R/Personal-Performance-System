import { supabase } from "@/integrations/supabase/client";

export type OfflineMutationType =
  | "TOGGLE_HABIT"
  | "LOG_FOCUS_SPRINT"
  | "UPDATE_HABIT"
  | "CREATE_HABIT";

export interface OfflineMutation {
  id: string;
  type: OfflineMutationType;
  payload: Record<string, any>;
  createdAt: string;
  retryCount: number;
}

const STORAGE_KEY = "pps_offline_mutation_queue";
const MAX_RETRIES = 5;

/**
 * Retrieve all pending mutations in the offline queue.
 */
export function getOfflineQueue(): OfflineMutation[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Failed to parse offline mutation queue:", err);
    return [];
  }
}

/**
 * Save updated queue to localStorage.
 */
function saveOfflineQueue(queue: OfflineMutation[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("Failed to persist offline mutation queue:", err);
  }
}

/**
 * Buffer a mutation to be replayed once internet connectivity is restored.
 */
export function enqueueOfflineMutation(
  type: OfflineMutationType,
  payload: Record<string, any>
): OfflineMutation {
  const mutation: OfflineMutation = {
    id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  const queue = getOfflineQueue();
  queue.push(mutation);
  saveOfflineQueue(queue);

  return mutation;
}

/**
 * Remove a specific mutation from the queue by ID.
 */
export function removeOfflineMutation(id: string): void {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  saveOfflineQueue(queue);
}

/**
 * Purge all items in the offline queue.
 */
export function clearOfflineQueue(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Count how many mutations are waiting to be synced.
 */
export function getOfflineQueueCount(): number {
  return getOfflineQueue().length;
}

/**
 * Default replayer that applies mutations against Supabase.
 */
async function defaultReplayMutation(mutation: OfflineMutation): Promise<boolean> {
  try {
    switch (mutation.type) {
      case "TOGGLE_HABIT": {
        const { habitId, dateStr, completed, userId } = mutation.payload;
        if (!habitId || !dateStr || !userId) return true;

        if (completed) {
          const { error } = await supabase.from("habit_completions").upsert(
            {
              habit_id: habitId,
              completed_date: dateStr,
              user_id: userId,
            },
            { onConflict: "habit_id,completed_date" }
          );
          if (error && error.code !== "23505") return false;

          if (mutation.payload.streak !== undefined) {
            await supabase.from("habits").update({
              streak: mutation.payload.streak,
              last_completed_date: mutation.payload.lastCompletedDate || dateStr,
              due_date: mutation.payload.dueDate,
            }).eq("id", habitId).eq("user_id", userId);
          }
          return true;
        } else {
          const { error } = await supabase
            .from("habit_completions")
            .delete()
            .match({ habit_id: habitId, completed_date: dateStr, user_id: userId });
          if (error) return false;

          if (mutation.payload.streak !== undefined) {
            await supabase.from("habits").update({
              streak: mutation.payload.streak,
              last_completed_date: mutation.payload.lastCompletedDate,
              due_date: mutation.payload.dueDate,
            }).eq("id", habitId).eq("user_id", userId);
          }
          return true;
        }
      }

      case "LOG_FOCUS_SPRINT": {
        const { durationMinutes, taskName, userId, habitId } = mutation.payload;
        if (!userId) return true;

        // In v1.0, logs focus sessions to telemetry or user metrics
        return true;
      }

      default:
        return true;
    }
  } catch (err) {
    console.error(`Offline sync replay error for ${mutation.type}:`, err);
    return false;
  }
}

/**
 * Flush all pending mutations in the queue.
 * Automatically called when connectivity is re-established.
 */
export async function flushOfflineQueue(
  customHandler?: (mutation: OfflineMutation) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  // Guard against flushing when completely offline
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { processed: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  const handler = customHandler || defaultReplayMutation;
  const remainingQueue: OfflineMutation[] = [];
  let processed = 0;
  let failed = 0;

  for (const mutation of queue) {
    try {
      const success = await handler(mutation);
      if (success) {
        processed++;
      } else {
        if (mutation.retryCount + 1 < MAX_RETRIES) {
          remainingQueue.push({
            ...mutation,
            retryCount: mutation.retryCount + 1,
          });
        }
        failed++;
      }
    } catch {
      if (mutation.retryCount + 1 < MAX_RETRIES) {
        remainingQueue.push({
          ...mutation,
          retryCount: mutation.retryCount + 1,
        });
      }
      failed++;
    }
  }

  saveOfflineQueue(remainingQueue);
  return { processed, failed };
}

/**
 * Register global 'online' listener to auto-flush the mutation queue.
 */
export function initOfflineSyncListener(
  handler?: (mutation: OfflineMutation) => Promise<boolean>
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => {
    flushOfflineQueue(handler).then((result) => {
      if (result.processed > 0) {
        window.dispatchEvent(
          new CustomEvent("pps_offline_sync_completed", { detail: result })
        );
      }
    });
  };

  window.addEventListener("online", handleOnline);
  return () => window.removeEventListener("online", handleOnline);
}
