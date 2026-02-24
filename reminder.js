/* ================= REMINDERS ================= */

let reminderKey = "";

/* ─────────────────────────────────────
   INIT
───────────────────────────────────── */
function setupReminders(user) {
    // user is passed from main.js but reminders can also
    // be called after init — safe fallback
    const currentUser = user || JSON.parse(localStorage.getItem("currentUser"));
    reminderKey = `reminders_${currentUser?.email || "guest"}`;

    renderReminders();

    // show/hide add form toggle
    const addBtn = document.getElementById("addReminderBtn");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            const form = document.getElementById("reminderForm");
            if (!form) return;
            const isVisible = form.style.display === "block";
            form.style.display = isVisible ? "none" : "block";
            addBtn.textContent = isVisible ? "+ Add Reminder" : "✕ Cancel";
        });
    }

    // save new reminder
    const saveBtn = document.getElementById("saveReminderBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", saveReminder);
    }
}

/* ─────────────────────────────────────
   GET / SAVE
───────────────────────────────────── */
function getReminders() {
    return JSON.parse(localStorage.getItem(reminderKey)) || [];
}

function saveReminders(reminders) {
    localStorage.setItem(reminderKey, JSON.stringify(reminders));
}

/* ─────────────────────────────────────
   SAVE NEW REMINDER
───────────────────────────────────── */
function saveReminder() {
    const label  = document.getElementById("reminderLabel")?.value.trim();
    const time   = document.getElementById("reminderTime")?.value;
    const repeat = document.getElementById("reminderRepeat")?.value;

    if (!label || !time) {
        alert("Please fill in label and time.");
        return;
    }

    const reminders = getReminders();

    reminders.push({
        id:      Date.now(),
        label:   label,
        time:    time,
        repeat:  repeat || "Every Day",
        enabled: true
    });

    saveReminders(reminders);
    renderReminders();

    // reset form
    document.getElementById("reminderLabel").value = "";
    document.getElementById("reminderTime").value  = "";

    // hide form
    const form   = document.getElementById("reminderForm");
    const addBtn = document.getElementById("addReminderBtn");
    if (form)   form.style.display  = "none";
    if (addBtn) addBtn.textContent   = "+ Add Reminder";
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

        // format time nicely e.g. "07:00" → "07:00 AM"
        const timeLabel = formatTime(reminder.time);

        row.innerHTML = `
            <div>
                <div style="font-size:14px; font-weight:600;">${reminder.label}</div>
                <div style="font-size:12px; color:var(--muted);">${reminder.repeat}</div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
                <span class="reminder-time">${timeLabel}</span>
                <div class="toggle ${reminder.enabled ? "on" : ""}"
                    data-id="${reminder.id}">
                    <div class="toggle-dot"></div>
                </div>
                <button class="danger-btn" style="padding:4px 10px; font-size:11px;"
                    data-id="${reminder.id}">✕</button>
            </div>
        `;

        // toggle enable/disable
        row.querySelector(".toggle").addEventListener("click", function () {
            toggleReminder(reminder.id);
        });

        // delete
        row.querySelector(".danger-btn").addEventListener("click", () => {
            deleteReminder(reminder.id);
        });

        list.appendChild(row);
    });
}

/* ─────────────────────────────────────
   TOGGLE ON/OFF
───────────────────────────────────── */
function toggleReminder(id) {
    const reminders = getReminders().map(r => {
        if (r.id === id) r.enabled = !r.enabled;
        return r;
    });
    saveReminders(reminders);
    renderReminders();
}

/* ─────────────────────────────────────
   DELETE
───────────────────────────────────── */
function deleteReminder(id) {
    if (!confirm("Delete this reminder?")) return;
    const reminders = getReminders().filter(r => r.id !== id);
    saveReminders(reminders);
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