/* ============================================================
   REMINDERS
   No addEventListener — buttons call functions directly via
   onclick attributes in HTML. Nothing can silently un-wire.
   ============================================================ */

/* ── KEY ── derived fresh every call ── */
function getReminderKey() {
    try {
        const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
        return "reminders_" + (u.email || "guest");
    } catch(e) { return "reminders_guest"; }
}

/* ── INIT ── just renders the list on load ── */
function setupReminders() {
    renderReminders();
}

/* ── GET ── */
function getReminders() {
    try {
        return JSON.parse(localStorage.getItem(getReminderKey())) || [];
    } catch(e) { return []; }
}

/* ── PERSIST ── */
function saveRemindersToStorage(list) {
    localStorage.setItem(getReminderKey(), JSON.stringify(list));
}

/* ── SAVE ── called by onclick on Save Reminder button ── */
function saveReminder() {
    const labelEl  = document.getElementById("reminderLabel");
    const timeEl   = document.getElementById("reminderTime");
    const repeatEl = document.getElementById("reminderRepeat");

    const label  = labelEl  ? labelEl.value.trim() : "";
    const time   = timeEl   ? timeEl.value          : "";
    const repeat = repeatEl ? repeatEl.value        : "Every Day";

    if (!label) { setReminderStatus("Please enter a label.", false); return; }
    if (!time)  { setReminderStatus("Please pick a time.",   false); return; }

    const list = getReminders();
    list.push({ id: Date.now(), label, time, repeat, enabled: true });
    saveRemindersToStorage(list);

    // Clear inputs
    if (labelEl) labelEl.value = "";
    if (timeEl)  timeEl.value  = "";

    setReminderStatus("Reminder saved ✓", true);
    renderReminders();
}

/* ── STATUS MESSAGE ── */
function setReminderStatus(msg, ok) {
    const el = document.getElementById("reminderStatus");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "var(--green)" : "var(--red)";
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ""; }, 3000);
}

/* ── RENDER ── */
function renderReminders() {
    const listEl = document.getElementById("reminderList");
    if (!listEl) return;

    const reminders = getReminders();
    if (reminders.length === 0) {
        listEl.innerHTML = `
            <div style="text-align:center;padding:24px;color:var(--muted);font-size:13px;">
                <div style="font-size:28px;margin-bottom:8px;">🔔</div>
                No reminders yet. Add one below.
            </div>`;
        return;
    }

    listEl.innerHTML = "";
    reminders.forEach(r => {
        const row = document.createElement("div");
        row.className = "reminder-row";
        row.innerHTML = `
            <div>
                <div style="font-size:14px;font-weight:600;">${r.label}</div>
                <div style="font-size:12px;color:var(--muted);">${r.repeat}</div>
            </div>
            <div style="display:flex;align-items:center;gap:16px;">
                <span class="reminder-time">${formatReminderTime(r.time)}</span>
                <div class="toggle ${r.enabled ? "on" : ""}"
                    onclick="toggleReminder(${r.id})">
                    <div class="toggle-dot"></div>
                </div>
                <button class="danger-btn" style="padding:4px 10px;font-size:11px;"
                    onclick="deleteReminder(${r.id})">✕</button>
            </div>`;
        listEl.appendChild(row);
    });
}

/* ── TOGGLE ── */
function toggleReminder(id) {
    const list = getReminders().map(r => {
        if (r.id === id) r.enabled = !r.enabled;
        return r;
    });
    saveRemindersToStorage(list);
    renderReminders();
}

/* ── DELETE ── */
function deleteReminder(id) {
    if (!confirm("Delete this reminder?")) return;
    saveRemindersToStorage(getReminders().filter(r => r.id !== id));
    renderReminders();
}

/* ── FORMAT TIME "07:30" → "07:30 AM" ── */
function formatReminderTime(str) {
    if (!str) return "";
    const [h, m] = str.split(":").map(Number);
    return (h % 12 || 12).toString().padStart(2, "0") + ":" +
           m.toString().padStart(2, "0") + " " + (h >= 12 ? "PM" : "AM");
}