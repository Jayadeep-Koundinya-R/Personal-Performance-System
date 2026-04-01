import { getData, saveData } from './storageService.js';

function getCurrentUser() {
    return getData('currentUser', {});
}

export function getReminderStorageKey() {
    const user = getCurrentUser();
    return `reminders_${user.email || 'guest'}`;
}

function showStatus(id, message, ok) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#22c55e' : '#ef4444';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
        el.textContent = '';
    }, 3000);
}

function notifyRemindersUpdated() {
    document.dispatchEvent(new CustomEvent('remindersUpdated'));
}

function sortReminders(list) {
    return [...list].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

export function getReminders() {
    return sortReminders(getData(getReminderStorageKey(), []));
}

export function saveRemindersList(list) {
    saveData(getReminderStorageKey(), sortReminders(list));
    notifyRemindersUpdated();
}

export function doesReminderMatchDay(reminder, date = new Date()) {
    const repeat = reminder.repeat || 'Every Day';
    const day = date.getDay();
    const isWeekday = day >= 1 && day <= 5;
    const isWeekend = day === 0 || day === 6;

    if (repeat === 'Weekdays') return isWeekday;
    if (repeat === 'Weekends') return isWeekend;
    return true;
}

export function formatReminderTime(timeValue) {
    const [rawHour = '0', rawMinute = '0'] = String(timeValue || '00:00').split(':');
    const hour = Number(rawHour);
    const minute = Number(rawMinute);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function getUpcomingReminders(limit = 3, now = new Date()) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return getReminders()
        .filter(reminder => reminder.enabled !== false)
        .map(reminder => {
            const [hour = 0, minute = 0] = String(reminder.time || '00:00').split(':').map(Number);
            const reminderMinutes = hour * 60 + minute;
            const delta = reminderMinutes - nowMinutes;
            const wrappedDelta = delta >= 0 ? delta : 1440 + delta;

            return {
                ...reminder,
                nextInMinutes: wrappedDelta
            };
        })
        .sort((a, b) => a.nextInMinutes - b.nextInMinutes)
        .slice(0, limit);
}

export function rem_save() {
    const labelEl = document.getElementById('rem_label');
    const timeEl = document.getElementById('rem_time');
    const repeatEl = document.getElementById('rem_repeat');

    const label = labelEl?.value.trim() || '';
    const time = timeEl?.value || '';
    const repeat = repeatEl?.value || 'Every Day';

    if (!label) {
        showStatus('rem_status', 'Enter a label.', false);
        return;
    }

    if (!time) {
        showStatus('rem_status', 'Pick a time.', false);
        return;
    }

    const list = getReminders();
    list.push({
        id: Date.now(),
        label,
        time,
        repeat,
        enabled: true
    });

    saveRemindersList(list);

    if (labelEl) labelEl.value = '';
    if (timeEl) timeEl.value = '';
    showStatus('rem_status', 'Reminder saved.', true);
}

export function rem_render() {
    const container = document.getElementById('rem_list');
    if (!container) return;

    const list = getReminders();
    if (list.length === 0) {
        container.innerHTML = `
            <div class="reminder-empty">
                <div class="reminder-empty-icon">🔔</div>
                <div>No reminders yet. Add one below.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(reminder => `
        <div class="reminder-row">
            <div>
                <div class="reminder-label">${reminder.label}</div>
                <div class="reminder-meta">${reminder.repeat}</div>
            </div>
            <div class="reminder-actions">
                <span class="reminder-time">${formatReminderTime(reminder.time)}</span>
                <button
                    class="toggle ${reminder.enabled ? 'on' : ''}"
                    type="button"
                    data-id="${reminder.id}"
                    onclick="rem_toggle(this)"
                    aria-label="${reminder.enabled ? 'Disable' : 'Enable'} reminder"
                >
                    <span class="toggle-dot"></span>
                </button>
                <button
                    class="danger-btn reminder-delete-btn"
                    type="button"
                    data-id="${reminder.id}"
                    onclick="rem_delete(this)"
                >
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

export function rem_toggle(el) {
    const id = Number(el.dataset.id);
    const list = getReminders().map(reminder => (
        reminder.id === id
            ? { ...reminder, enabled: !reminder.enabled }
            : reminder
    ));

    saveRemindersList(list);
}

export function rem_delete(el) {
    const id = Number(el.dataset.id);
    if (!confirm('Delete this reminder?')) return;

    const list = getReminders().filter(reminder => reminder.id !== id);
    saveRemindersList(list);
}

export function setupReminders() {
    rem_render();
}
