import { Capacitor } from "@capacitor/core";
import { LocalNotifications, PermissionStatus } from "@capacitor/local-notifications";

/**
 * Native Local Notifications Helper.
 * Bridges Capacitor Local Notifications plugin for iOS/Android
 * while gracefully falling back to browser behavior on web.
 */

export const isNativeMobile = (): boolean => {
  return Capacitor.isNativePlatform();
};

export async function initNativeNotifications(): Promise<boolean> {
  if (!isNativeMobile()) return false;

  try {
    // 1. Create Android Notification Channel for heads-up alerts and sound
    await LocalNotifications.createChannel({
      id: "pps-reminders",
      name: "Habit & Focus Reminders",
      description: "Notifications for habit reminders and focus timer alerts",
      importance: 5, // High importance (heads-up banner + sound + vibration)
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: "#6366F1",
    });

    // 2. Check and request runtime notification permissions
    const check: PermissionStatus = await LocalNotifications.checkPermissions();
    if (check.display === "granted") return true;

    const req: PermissionStatus = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  } catch (err) {
    console.warn("Failed to initialize native notifications:", err);
    return false;
  }
}

export async function requestNativeNotificationPermissions(): Promise<boolean> {
  return initNativeNotifications();
}

export async function scheduleNativeLocalNotification(params: {
  id: number;
  title: string;
  body: string;
  scheduleAt?: Date;
  extra?: Record<string, any>;
}): Promise<boolean> {
  if (!isNativeMobile()) return false;

  try {
    const hasPermission = await requestNativeNotificationPermissions();
    if (!hasPermission) return false;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: params.id,
          title: params.title,
          body: params.body,
          schedule: params.scheduleAt ? { at: params.scheduleAt } : undefined,
          channelId: "pps-reminders",
          smallIcon: "ic_launcher",
          iconColor: "#6366F1",
          sound: "beep.wav",
          extra: params.extra || {},
          actionTypeId: "OPEN_APP",
        },
      ],
    });
    return true;
  } catch (err) {
    console.error("Error scheduling native local notification:", err);
    return false;
  }
}

export async function cancelNativeNotification(id: number): Promise<boolean> {
  if (!isNativeMobile()) return false;

  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
    return true;
  } catch (err) {
    console.error("Error cancelling native local notification:", err);
    return false;
  }
}

export function initNativeNotificationListeners(onNotificationTap?: (extra: any) => void) {
  if (!isNativeMobile()) return;

  try {
    LocalNotifications.addListener("localNotificationActionPerformed", (notificationAction) => {
      const extraData = notificationAction.notification.extra;
      if (onNotificationTap && extraData) {
        onNotificationTap(extraData);
      }
    });
  } catch (err) {
    console.warn("Could not attach native notification listener:", err);
  }
}

/**
 * ⚡ Fires immediately when the app is first opened after installation
 */
export async function sendWelcomeNotification(): Promise<boolean> {
  return scheduleNativeLocalNotification({
    id: 1001,
    title: "⚡ Welcome to PPS!",
    body: "Your Personal Performance System is active. Tap to explore your dashboard and start your streak!",
    extra: { type: "welcome" },
  });
}

/**
 * 🔐 Fires immediately after logging in with Gmail / Supabase / Email
 */
export async function sendLoginNotification(userEmail?: string | null): Promise<boolean> {
  const displayEmail = userEmail ? ` (${userEmail})` : "";
  return scheduleNativeLocalNotification({
    id: 1002,
    title: "🔐 Welcome Back to PPS!",
    body: `Successfully signed in${displayEmail}. Your habits and cloud stats are synchronized.`,
    extra: { type: "login", email: userEmail },
  });
}

/**
 * 🚀 Fires immediately when starting a 7-Day Free Trial / Guest mode
 */
export async function sendFreeTrialNotification(guestName?: string | null): Promise<boolean> {
  const nameStr = guestName ? `${guestName}! ` : "";
  return scheduleNativeLocalNotification({
    id: 1003,
    title: "🚀 7-Day Free Trial Activated!",
    body: `Welcome ${nameStr}Your Pro performance features & AI coach are unlocked. Let's crush today's goals!`,
    extra: { type: "free_trial", guestName },
  });
}

