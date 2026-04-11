import { getData, saveData } from './storageService.js';
import { doesReminderMatchDay, formatReminderTime, getReminders } from './reminder.js';

let notifInterval = null;
let notifRunning = false;

function getCurrentUser() {
    return getData('currentUser', {});
}

function getAlertStorageKey() {
    const user = getCurrentUser();
    return `pps_alerts_${user.email || 'guest'}`;
}

function setStatus(message, ok) {
    // Try multiple times in case the element isn't rendered yet (section hidden)
    const trySet = () => {
        const el = document.getElementById('notif_status');
        if (el) {
            el.textContent = message;
            el.style.color = ok ? '#22c55e' : '#ef4444';
        }
    };
    trySet();
    // Retry after a tick in case the section becomes visible later
    setTimeout(trySet, 100);
}

function notifyAlertChange() {
    document.dispatchEvent(new CustomEvent('notificationAlertsUpdated'));
}

export function getNotificationAlerts() {
    return getData(getAlertStorageKey(), []).sort((a, b) => new Date(b.firedAt) - new Date(a.firedAt));
}

function saveNotificationAlerts(list) {
    saveData(getAlertStorageKey(), list.slice(0, 50));
    notifyAlertChange();
}

export function getUnreadAlertCount() {
    return getNotificationAlerts().filter(alert => !alert.read).length;
}

export function markAlertRead(alertId) {
    const updated = getNotificationAlerts().map(alert => (
        alert.id === alertId ? { ...alert, read: true } : alert
    ));
    saveNotificationAlerts(updated);
}

export function markAllAlertsRead() {
    const updated = getNotificationAlerts().map(alert => ({ ...alert, read: true }));
    saveNotificationAlerts(updated);
}

export function clearNotificationAlerts() {
    saveNotificationAlerts([]);
}

function pushAlert(reminder, firedAt) {
    const alerts = getNotificationAlerts();
    const exists = alerts.some(alert => alert.reminderId === reminder.id && alert.minuteKey === firedAt.minuteKey);
    if (exists) return;

    alerts.unshift({
        id: `${reminder.id}-${firedAt.minuteKey}`,
        reminderId: reminder.id,
        label: reminder.label,
        repeat: reminder.repeat || 'Every Day',
        time: reminder.time,
        minuteKey: firedAt.minuteKey,
        firedAt: firedAt.iso,
        read: false
    });

    saveNotificationAlerts(alerts);
}

function fireBrowserNotification(reminder) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const notification = new Notification(`⏰ ${reminder.label}`, {
        body: `Reminder: ${formatReminderTime(reminder.time)} • ${reminder.repeat || 'Every Day'}`,
        tag: `pps-${reminder.id}`
    });

    setTimeout(() => notification.close(), 8000);
    notification.onclick = () => {
        window.focus();
        notification.close();
    };
}

function checkReminders() {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = now.toISOString().split('T')[0];

    getReminders().forEach(reminder => {
        if (!reminder.enabled || reminder.time !== time) return;
        if (!doesReminderMatchDay(reminder, now)) return;

        const minuteKey = `${today}-${time}`;
        const fireKey = `pps_notif_${reminder.id}_${minuteKey}`;
        if (sessionStorage.getItem(fireKey)) return;
        sessionStorage.setItem(fireKey, '1');

        const firedAt = {
            iso: now.toISOString(),
            minuteKey
        };

        pushAlert(reminder, firedAt);
        fireBrowserNotification(reminder);
    });
}

export function notif_requestPermission() {
    if (typeof Notification === 'undefined') {
        setStatus('In-app alerts only. Browser notifications unavailable.', false);
        notif_startChecker();
        return;
    }

    if (Notification.permission === 'denied') {
        setStatus('Browser notifications blocked. In-app alerts still work.', false);
        notif_startChecker();
        return;
    }

    if (Notification.permission === 'granted') {
        // Already granted — just restart the checker (handles stop → enable flow)
        notifRunning = false; // force restart even if it was running
        notif_startChecker();
        return;
    }

    // Not yet asked — request permission
    Notification.requestPermission().then(result => {
        if (result === 'granted') {
            notifRunning = false;
            notif_startChecker();
            fireBrowserNotification({
                id: 'pps-on',
                label: 'PPS notifications enabled',
                time: new Date().toTimeString().slice(0, 5),
                repeat: 'One time'
            });
        } else {
            setStatus('In-app alerts on. Browser popups were denied.', false);
            notifRunning = false;
            notif_startChecker();
        }
    });
}

export function notif_stop() {
    if (notifInterval) {
        clearInterval(notifInterval);
        notifInterval = null;
    }
    notifRunning = false;
    setStatus('Alerts stopped. Click Enable to restart.', false);
}

export function notif_startChecker() {
    // Always allow restart — notif_stop resets notifRunning to false
    if (notifRunning) return;
    notifRunning = true;
    checkReminders();
    notifInterval = setInterval(checkReminders, 10000);

    if (typeof Notification === 'undefined') {
        setStatus('In-app alerts are active.', true);
    } else if (Notification.permission === 'granted') {
        setStatus('Browser and in-app alerts are active.', true);
    } else if (Notification.permission === 'denied') {
        setStatus('In-app alerts active. Browser popups blocked.', false);
    } else {
        setStatus('In-app alerts active. Enable browser notifications for popups.', true);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    notif_startChecker();
});
