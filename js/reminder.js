/* ================= REMINDERS ================= */

let reminderKey = "";

/* ─────────────────────────────────────
   SETUP
───────────────────────────────────── */
function setupReminders(user) {
    const uid    = (user && user.email) ? user.email : "guest";
    reminderKey  = "reminders_" + uid;

    renderReminders();

    // Save
    document.getElementById("saveReminderBtn")
        ?.addEventListener("click", saveReminder);
}

/* ─────────────────────────────────────
   GET / PERSIST
───────────────────────────────────── */
function getReminders() {
    if (!reminderKey) return [];
    try { return JSON.parse(localStorage.getItem(reminderKey)) || []; }
    catch(e) { return []; }
}

function persistReminders(list) {
    localStorage.setItem(reminderKey, JSON.stringify(list));
}

/* ─────────────────────────────────────
   SAVE NEW REMINDER
───────────────────────────────────── */
function saveReminder() {
    const labelEl  = document.getElementById("reminderLabel");
    const timeEl   = document.getElementById("reminderTime");
    const repeatEl = document.getElementById("reminderRepeat");

    const label  = labelEl?.value.trim();
    const time   = timeEl?.value;
    const repeat = repeatEl?.value || "Every Day";

    if (!label) { alert("Please enter a label."); return; }
    if (!time)  { alert("Please pick a time.");   return; }

    const list = getReminders();
    list.push({ id: Date.now(), label, time, repeat, enabled: true });
    persistReminders(list);
    renderReminders();

    // Reset inputs
    if (labelEl) labelEl.value = "";
    if (timeEl)  timeEl.value  = "";

    // Keep form open so user can add more if needed
    showReminderMsg("Reminder saved ✓");
}

/* ─────────────────────────────────────
   RENDER LIST
───────────────────────────────────── */
function renderReminders() {
    const list = document.getElementById("reminderList");
    if (!list) return;

    const reminders = getReminders();

    if (reminders.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding:28px; color:var(--muted); font-size:13px;">
                <div style="font-size:28px; margin-bottom:8px;">🔔</div>
                No reminders yet. Add one below.
            </div>`;
        return;
    }

    list.innerHTML = "";
    reminders.forEach(r => {
        const row = document.createElement("div");
        row.className = "reminder-row";
        row.innerHTML = `
            <div>
                <div style="font-size:14px; font-weight:600;">${r.label}</div>
                <div style="font-size:12px; color:var(--muted);">${r.repeat}</div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
                <span class="reminder-time">${formatTime(r.time)}</span>
                <div class="toggle ${r.enabled ? "on" : ""}" data-id="${r.id}">
                    <div class="toggle-dot"></div>
                </div>
                <button class="danger-btn"
                    style="padding:4px 10px; font-size:11px;"
                    data-id="${r.id}">✕</button>
            </div>`;

        row.querySelector(".toggle")
            .addEventListener("click", () => {
                const updated = getReminders().map(x => {
                    if (x.id === r.id) x.enabled = !x.enabled;
                    return x;
                });
                persistReminders(updated);
                renderReminders();
            });

        row.querySelector(".danger-btn")
            .addEventListener("click", () => {
                if (!confirm(`Delete "${r.label}"?`)) return;
                persistReminders(getReminders().filter(x => x.id !== r.id));
                renderReminders();
            });

        list.appendChild(row);
    });
}

/* ─────────────────────────────────────
   FEEDBACK MESSAGE
───────────────────────────────────── */
function showReminderMsg(text) {
    let el = document.getElementById("reminderSaveMsg");
    if (!el) {
        el = document.createElement("span");
        el.id = "reminderSaveMsg";
        el.style.cssText = "font-size:12px; color:var(--green); margin-left:12px;";
        const btn = document.getElementById("saveReminderBtn");
        if (btn) btn.parentNode.appendChild(el);
    }
    el.textContent = text;
    setTimeout(() => { el.textContent = ""; }, 2500);
}

/* ─────────────────────────────────────
   FORMAT TIME  "07:30" → "07:30 AM"
───────────────────────────────────── */
function formatTime(str) {
    if (!str) return "";
    const [h, m] = str.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour   = h % 12 || 12;
    return String(hour).padStart(2, "0") + ":" + String(m).padStart(2, "0") + " " + period;
}