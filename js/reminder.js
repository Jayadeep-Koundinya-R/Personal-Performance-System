/* ================= REMINDERS ================= */

let reminderKey = "";

/* ─────────────────────────────────────
   INIT
───────────────────────────────────── */
function setupReminders(user) {
    const currentUser = user || JSON.parse(localStorage.getItem("currentUser"));
    reminderKey = `reminders_${currentUser?.email || "guest"}`;

    renderReminders();

    // Show / hide add form
    document.getElementById("addReminderBtn")
        ?.addEventListener("click", () => {
            const form   = document.getElementById("reminderForm");
            const addBtn = document.getElementById("addReminderBtn");
            if (!form) return;
            const showing = form.style.display === "block";
            form.style.display  = showing ? "none" : "block";
            addBtn.textContent  = showing ? "+ Add Reminder" : "✕ Cancel";
        });

    // Save button
    document.getElementById("saveReminderBtn")
        ?.addEventListener("click", saveReminder);
}

/* ─────────────────────────────────────
   GET / SAVE
───────────────────────────────────── */
function getReminders() {
    return JSON.parse(localStorage.getItem(reminderKey)) || [];
}

function saveRemindersToStorage(reminders) {
    localStorage.setItem(reminderKey, JSON.stringify(reminders));
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

    if (!label) {
        alert("Please enter a label for the reminder.");
        return;
    }
    if (!time) {
        alert("Please select a time.");
        return;
    }

    const reminders = getReminders();
    reminders.push({
        id:      Date.now(),
        label:   label,
        time:    time,
        repeat:  repeat,
        enabled: true
    });

    saveRemindersToStorage(reminders);
    renderReminders();

    // Reset + hide form
    if (labelEl)  labelEl.value  = "";
    if (timeEl)   timeEl.value   = "";

    const form   = document.getElementById("reminderForm");
    const addBtn = document.getElementById("addReminderBtn");
    if (form)   form.style.display = "none";
    if (addBtn) addBtn.textContent  = "+ Add Reminder";
}

/* ─────────────────────────────────────
   RENDER LIST
───────────────────────────────────── */
function renderReminders() {
    const list = document.getElementById("reminderList");
    if (!list) return;

    const reminders = getReminders();

    if (reminders.length === 0) {
        list.innerHTML = `<p class="empty-text">No reminders set yet.</p>`;
        return;
    }

    list.innerHTML = "";

    reminders.forEach(reminder => {
        const row = document.createElement("div");
        row.className = "reminder-row";

        row.innerHTML = `
            <div>
                <div style="font-size:14px; font-weight:600;">${reminder.label}</div>
                <div style="font-size:12px; color:var(--muted);">${reminder.repeat}</div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
                <span class="reminder-time">${formatTime(reminder.time)}</span>
                <div class="toggle ${reminder.enabled ? "on" : ""}" data-id="${reminder.id}">
                    <div class="toggle-dot"></div>
                </div>
                <button class="danger-btn del-reminder-btn"
                    style="padding:4px 10px; font-size:11px;"
                    data-id="${reminder.id}">✕</button>
            </div>
        `;

        row.querySelector(".toggle")
            .addEventListener("click", () => toggleReminder(reminder.id));

        row.querySelector(".del-reminder-btn")
            .addEventListener("click", () => deleteReminder(reminder.id));

        list.appendChild(row);
    });
}

/* ─────────────────────────────────────
   TOGGLE ENABLED / DISABLED
───────────────────────────────────── */
function toggleReminder(id) {
    const reminders = getReminders().map(r => {
        if (r.id === id) r.enabled = !r.enabled;
        return r;
    });
    saveRemindersToStorage(reminders);
    renderReminders();
}

/* ─────────────────────────────────────
   DELETE
───────────────────────────────────── */
function deleteReminder(id) {
    if (!confirm("Delete this reminder?")) return;
    const reminders = getReminders().filter(r => r.id !== id);
    saveRemindersToStorage(reminders);
    renderReminders();
}

/* ─────────────────────────────────────
   FORMAT TIME  "07:30" → "07:30 AM"
───────────────────────────────────── */
function formatTime(timeStr) {
    if (!timeStr) return "";
    const [h, m]  = timeStr.split(":").map(Number);
    const period  = h >= 12 ? "PM" : "AM";
    const hour    = h % 12 || 12;
    return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}