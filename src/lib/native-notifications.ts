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

export async function requestNativeNotificationPermissions(): Promise<boolean> {
  if (!isNativeMobile()) return false;

  try {
    const check: PermissionStatus = await LocalNotifications.checkPermissions();
    if (check.display === "granted") return true;

    const req: PermissionStatus = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  } catch (err) {
    console.warn("Failed to request native notification permissions:", err);
    return false;
  }
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
