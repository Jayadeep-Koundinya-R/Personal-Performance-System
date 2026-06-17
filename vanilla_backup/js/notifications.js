import { getData, saveData } from './storageService.js';
import { doesReminderMatchDay, formatReminderTime, getReminders } from './reminder.js';

let notifInterval = null;
let notifRunning  = false;

// Keep last status in memory so it can be re-applied when section becomes visible
let _lastStatus = { message: '', ok: true };

function getCurrentUser() {
    return getData('currentUser', {});
}

function getAlertStorageKey() {
    const user = getCurrentUser();
    return `pps_alerts_${user.email || 'guest'}`;
}

function setStatus(message, ok) {
    _lastStatus = { message, ok };
    const el = document.getElementById('notif_status');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#22c55e' : '#ef4444';
}

/** Call this whenever the reminders section becomes visible to sync the status text. */
export function notif_syncStatus() {
    const el = document.getElementById('notif_status');
    if (el) {
        if (_lastStatus.message) {
            el.textContent = _lastStatus.message;
            el.style.color = _lastStatus.ok ? '#22c55e' : '#ef4444';
        } else if (!notifRunning) {
            el.textContent = 'Alerts not started.';
            el.style.color = '#ef4444';
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            el.textContent = 'Browser and in-app alerts are active.';
            el.style.color = '#22c55e';
        } else {
            el.textContent = 'In-app alerts are active.';
            el.style.color = '#22c55e';
        }
    }
    _updateButtonStates(notifRunning);
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
        setStatus('Browser notifications not supported. In-app alerts still work.', false);
        notifRunning = false;
        notif_startChecker();
        return;
    }

    if (Notification.permission === 'denied') {
        // Browser has permanently blocked — JS cannot re-ask. Show manual instructions.
        _showUnblockGuide();
        setStatus('Blocked by browser. See instructions above.', false);
        _updateButtonStates(false);
        return;
    }

    if (Notification.permission === 'granted') {
        notifRunning = false;
        notif_startChecker();
        return;
    }

    // 'default' — not yet asked, show the browser prompt
    Notification.requestPermission().then(result => {
        notifRunning = false;
        if (result === 'granted') {
            notif_startChecker();
            fireBrowserNotification({
                id: 'pps-on',
                label: 'PPS notifications enabled',
                time: new Date().toTimeString().slice(0, 5),
                repeat: 'One time'
            });
        } else if (result === 'denied') {
            _showUnblockGuide();
            setStatus('Blocked by browser. See instructions above.', false);
            _updateButtonStates(false);
            // Still start in-app alerts
            notif_startChecker();
        } else {
            setStatus('Permission dismissed. Try again.', false);
            _updateButtonStates(false);
        }
    });
}

function _showUnblockGuide() {
    // Remove any existing guide first
    document.getElementById('_pps_unblock_guide')?.remove();

    const isChrome  = navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edg');
    const isFirefox = navigator.userAgent.includes('Firefox');
    const isEdge    = navigator.userAgent.includes('Edg/');
    const isSafari  = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');

    let steps = '';
    if (isFirefox) {
        steps = `
            <li>Click the <strong>🔒 lock icon</strong> in the address bar</li>
            <li>Find <strong>Notifications</strong> → change to <strong>Allow</strong></li>
            <li>Reload the page, then click Enable again</li>`;
    } else if (isEdge) {
        steps = `
            <li>Click the <strong>🔒 lock icon</strong> in the address bar</li>
            <li>Click <strong>Permissions for this site</strong></li>
            <li>Set <strong>Notifications</strong> to <strong>Allow</strong></li>
            <li>Reload the page, then click Enable again</li>`;
    } else if (isSafari) {
        steps = `
            <li>Go to <strong>Safari → Settings → Websites → Notifications</strong></li>
            <li>Find this site and set it to <strong>Allow</strong></li>
            <li>Reload the page, then click Enable again</li>`;
    } else {
        // Chrome / default
        steps = `
            <li>Click the <strong>🔒 lock icon</strong> in the address bar</li>
            <li>Click <strong>Site settings</strong></li>
            <li>Find <strong>Notifications</strong> → change to <strong>Allow</strong></li>
            <li>Reload the page, then click Enable again</li>`;
    }

    const guide = document.createElement('div');
    guide.id = '_pps_unblock_guide';
    guide.style.cssText = `
        margin-bottom: 16px;
        background: rgba(255,77,106,0.08);
        border: 1px solid rgba(255,77,106,0.3);
        border-radius: 14px;
        padding: 16px 20px;
        font-family: 'Space Grotesk', sans-serif;
    `;
    guide.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
            <div style="font-size:13px;font-weight:700;color:var(--red);">🚫 Notifications are blocked by your browser</div>
            <button onclick="document.getElementById('_pps_unblock_guide').remove()"
                style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:0;line-height:1;">✕</button>
        </div>
        <div style="font-size:12px;color:var(--text-2);margin-bottom:10px;">
            JavaScript cannot re-ask once blocked. Follow these steps to unblock:
        </div>
        <ol style="font-size:12px;color:var(--text-2);line-height:1.9;padding-left:18px;margin:0;">
            ${steps}
        </ol>
        <div style="font-size:11px;color:var(--muted);margin-top:10px;font-family:'DM Mono',monospace;">
            In-app alerts (bell icon) still work without browser permission.
        </div>
    `;

    // Insert before the notification banner
    const banner = document.querySelector('.notif-control-banner');
    if (banner) {
        banner.parentNode.insertBefore(guide, banner);
    } else {
        // Fallback — append to reminders section
        document.getElementById('reminderSection')?.appendChild(guide);
    }
}

function _updateButtonStates(running) {
    const enableBtn = document.getElementById('notifEnableBtn');
    const stopBtn   = document.getElementById('notifStopBtn');
    if (enableBtn) {
        enableBtn.disabled = running;
        enableBtn.style.opacity = running ? '0.45' : '1';
        enableBtn.textContent = running ? 'Active ✓' : 'Enable';
    }
    if (stopBtn) {
        stopBtn.disabled = !running;
        stopBtn.style.opacity = !running ? '0.45' : '1';
    }
}

export function notif_stop() {
    if (notifInterval) {
        clearInterval(notifInterval);
        notifInterval = null;
    }
    notifRunning = false;
    setStatus('Alerts stopped. Click Enable to restart.', false);
    _updateButtonStates(false);
}

export function notif_startChecker() {
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
    _updateButtonStates(true);
}

document.addEventListener('DOMContentLoaded', () => {
    notif_startChecker();
});
