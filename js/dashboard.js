/* ================= DASHBOARD RENDERING ================= */

/* ─────────────────────────────────────
   MAIN DASHBOARD RENDER
───────────────────────────────────── */
function renderDashboard() {
    const criticalList = document.getElementById("criticalList");
    const highList     = document.getElementById("highList");
    const mediumList   = document.getElementById("mediumList");
    const upcomingList = document.getElementById("upcomingList");

    if (!criticalList || !highList || !mediumList || !upcomingList) return;

    criticalList.innerHTML = "";
    highList.innerHTML     = "";
    mediumList.innerHTML   = "";
    upcomingList.innerHTML = "";

    const todayStr = new Date().toISOString().split("T")[0];
    const today    = new Date(); today.setHours(0, 0, 0, 0);

    habits.forEach(habit => {
        const dueDate = new Date(habit.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = (dueDate - today) / (1000 * 60 * 60 * 24);

        // Use isHabitDueToday for consistency with tracker and stats
        const dueToday         = isHabitDueToday(habit);
        const isCompletedToday = habit.completedDates.includes(todayStr);

        // Status tag
        let tagClass = "tag-upcoming";
        let tagText  = "Due " + dueDate.toLocaleDateString(undefined, { weekday: "long" });

        if (diffDays < 0) {
            tagClass = "tag-overdue";
            tagText  = "Overdue";
        } else if (diffDays === 0) {
            tagClass = isCompletedToday ? "tag-done" : "tag-today";
            tagText  = isCompletedToday ? "Done ✓"  : "Due Today";
        } else if (diffDays === 1) {
            tagClass = "tag-tomorrow";
            tagText  = "Due Tomorrow";
        }

        const taskDiv = document.createElement("div");
        taskDiv.className = "task-item";
        taskDiv.innerHTML = `
            <div class="task-left">
                <input type="checkbox"
                    data-id="${habit.id}"
                    ${isCompletedToday ? "checked" : ""}>
                <span class="${isCompletedToday ? "task-done" : ""}">
                    ${habit.name}
                </span>
            </div>
            <span class="status-tag ${tagClass}">${tagText}</span>
        `;

        taskDiv.querySelector("input[type='checkbox']")
            .addEventListener("change", function () {
                updateHabitCompletion(habit, this.checked);
                renderDashboard();
                renderDailyTracker();
                updateAllStats();
            });

        // Classify: overdue/today → Critical, else by priority
        if (dueToday) {
            criticalList.appendChild(taskDiv);
        } else {
            switch (habit.priority) {
                case "High":   highList.appendChild(taskDiv);    break;
                case "Medium": mediumList.appendChild(taskDiv);  break;
                default:       upcomingList.appendChild(taskDiv);
            }
        }
    });

    // Empty states
    if (!criticalList.innerHTML) criticalList.innerHTML = `<div class="task-item"><span>No critical tasks 🎉</span></div>`;
    if (!highList.innerHTML)     highList.innerHTML     = `<div class="task-item"><span>No high priority tasks</span></div>`;
    if (!mediumList.innerHTML)   mediumList.innerHTML   = `<div class="task-item"><span>No medium tasks</span></div>`;
    if (!upcomingList.innerHTML) upcomingList.innerHTML = `<div class="task-item"><span>No upcoming tasks</span></div>`;

    updateAllStats();
}

/* ─────────────────────────────────────
   UPDATE ALL STATS — single call updates
   every widget on the page at once
───────────────────────────────────── */
function updateAllStats() {
    updateCompletionStats();
    updateProgressWidget();
    updateWeeklyChart();
    updateLevelWidget();
    updateDateDisplay();
}

/* ─────────────────────────────────────
   COMPLETION RATE + STAT CARDS
   FIX: uses isHabitDueToday() so the
   same habit set is counted everywhere
───────────────────────────────────── */
function updateCompletionStats() {
    const todayStr = new Date().toISOString().split("T")[0];

    let dueTodayCount       = 0;
    let completedTodayCount = 0;
    let totalFreezeCredits  = 0;
    let maxStreak           = 0;

    habits.forEach(habit => {
        if (isHabitDueToday(habit)) {
            dueTodayCount++;
            if (habit.completedDates.includes(todayStr)) completedTodayCount++;
        }
        totalFreezeCredits += habit.freezeCredits || 0;
        maxStreak = Math.max(maxStreak, habit.streak || 0);
    });

    const pct = dueTodayCount > 0
        ? Math.round((completedTodayCount / dueTodayCount) * 100)
        : 0;

    // Stat cards
    setEl("completionRate",       pct + "%");
    setEl("freezeCreditsDisplay", totalFreezeCredits);
    setEl("currentStreak",        "🔥 " + maxStreak);
    setEl("weeklyPoints",         calculateWeeklyPoints(habits));

    // Streak section
    setEl("heroStreak", maxStreak);
    setEl("heroFreeze", totalFreezeCredits);
    setEl("heroBest",   maxStreak);
    setEl("heroTotal",  habits.reduce((s, h) => s + h.completedDates.length, 0));

    // Analytics section
    setEl("avgCompletion", pct + "%");
    setEl("bestStreak",    maxStreak);
    setEl("totalXP",       calculateTotalXP(habits));
    setEl("totalDone",     habits.reduce((s, h) => s + h.completedDates.length, 0));
}

/* ─────────────────────────────────────
   TODAY'S PROGRESS WIDGET
   FIX: uses isHabitDueToday() —
   same logic as completion rate
───────────────────────────────────── */
function updateProgressWidget() {
    const todayStr = new Date().toISOString().split("T")[0];

    let due  = 0;
    let done = 0;

    habits.forEach(habit => {
        if (isHabitDueToday(habit)) {
            due++;
            if (habit.completedDates.includes(todayStr)) done++;
        }
    });

    const pct = due > 0 ? Math.round((done / due) * 100) : 0;

    // Dashboard right widget
    setEl("todayProgress", `${done}/${due}`);
    setBar("todayProgressBar", pct);

    // Daily Tracker header
    setEl("trackerProgress", `${done}/${due}`);
    setBar("trackerProgressBar", pct);
    setEl("trackerPercent",  pct + "% complete");
}

/* ─────────────────────────────────────
   DAILY TRACKER SECTION
───────────────────────────────────── */
function renderDailyTracker() {
    const trackerList = document.getElementById("trackerList");
    if (!trackerList) return;

    trackerList.innerHTML = "";

    // Only show habits due today
    const todayHabits = habits.filter(h => isHabitDueToday(h));
    const todayStr    = new Date().toISOString().split("T")[0];

    if (todayHabits.length === 0) {
        trackerList.innerHTML = `<p class="empty-text">No habits due today 🎉 Add habits in Habit Manager.</p>`;
        updateProgressWidget();
        return;
    }

    // Group by category
    const grouped = {};
    todayHabits.forEach(habit => {
        const cat = habit.category || "Uncategorized";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(habit);
    });

    Object.keys(grouped).forEach(category => {
        const section = document.createElement("div");
        section.className = "card";
        section.style.marginBottom = "16px";

        const title = document.createElement("h3");
        title.textContent = category;
        section.appendChild(title);

        grouped[category].forEach(habit => {
            const isCompleted = habit.completedDates.includes(todayStr);

            const priClass = {
                "High":     "pri-high",
                "Medium":   "pri-medium",
                "Low":      "pri-low",
                "Optional": "pri-optional"
            }[habit.priority] || "pri-optional";

            const row = document.createElement("div");
            row.className = "task-item";
            row.innerHTML = `
                <div class="task-left">
                    <input type="checkbox"
                        data-id="${habit.id}"
                        ${isCompleted ? "checked" : ""}>
                    <span class="${isCompleted ? "task-done" : ""}">
                        ${habit.name}
                    </span>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <span class="status-tag ${priClass}">${habit.priority}</span>
                    <span class="status-tag ${isCompleted ? "tag-done" : "tag-today"}">
                        ${isCompleted ? "+10 XP ✓" : "+10 XP"}
                    </span>
                </div>
            `;

            row.querySelector("input[type='checkbox']")
                .addEventListener("change", function () {
                    updateHabitCompletion(habit, this.checked);
                    renderDailyTracker();
                    updateAllStats();
                });

            section.appendChild(row);
        });

        trackerList.appendChild(section);
    });

    updateProgressWidget();
}

/* ─────────────────────────────────────
   WEEKLY MINI BAR CHART
───────────────────────────────────── */
function updateWeeklyChart() {
    const chartEl = document.getElementById("weeklyChart");
    if (!chartEl) return;

    const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const counts = new Array(7).fill(0);
    const today  = new Date();

    // Build last 7 days from Mon→Sun relative to today
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr  = d.toISOString().split("T")[0];
        const dayIndex = 6 - i;

        habits.forEach(habit => {
            if (habit.completedDates.includes(dateStr)) counts[dayIndex]++;
        });
    }

    const max = Math.max(...counts, 1);

    chartEl.innerHTML = labels.map((label, i) => {
        const heightPct = Math.round((counts[i] / max) * 100);
        const isToday   = i === 6;
        const color     = isToday
            ? "linear-gradient(180deg,#22d3ee,#0891b2)"
            : "linear-gradient(180deg,#6366f1,#4338ca)";
        return `
            <div class="bar-col">
                <div class="bar" style="height:${heightPct || 4}%; background:${color};"></div>
                <div class="bar-label">${label}</div>
            </div>
        `;
    }).join("");
}

/* ─────────────────────────────────────
   LEVEL + XP WIDGET
───────────────────────────────────── */
function updateLevelWidget() {
    const xp        = calculateTotalXP(habits);
    const level     = calculateLevel(habits);
    const xpInLevel = xp % 100;

    setEl("userLevel",  "Lv. " + level);
    setEl("xpDisplay",  `${xpInLevel} / 100 XP`);
    setBar("xpBar",     xpInLevel,
           "linear-gradient(90deg,#f97316,#fbbf24)");
    setEl("xpToNext",   `${100 - xpInLevel} XP to Level ${level + 1}`);

    // Sidebar chip
    setEl("userLevelDisplay", `Level ${level} • ${xp} XP`);
}

/* ─────────────────────────────────────
   STREAK SECTION
───────────────────────────────────── */
function renderStreakSection() {
    const container = document.getElementById("habitStreakList");
    if (!container) return;

    container.innerHTML = "";

    if (habits.length === 0) {
        container.innerHTML = `<p class="empty-text">No habits yet.</p>`;
        return;
    }

    habits.forEach(habit => {
        const streak = habit.streak || 0;
        const pct    = Math.min(streak * 10, 100); // 10 days = full bar

        let color = "#6366f1";
        let icon  = "🔥";
        if (streak === 0)  { color = "#ef4444"; icon = "💀"; }
        else if (streak >= 7) { color = "#f97316"; }

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-title">${habit.name}</div>
            <div style="font-size:26px; font-weight:700; color:${color};
                        font-family:'JetBrains Mono',monospace;">
                ${icon} ${streak}
            </div>
            <div class="text-muted" style="font-size:12px; margin-top:4px;">day streak</div>
            <div class="prog-wrap mt-8">
                <div class="prog-fill"
                    style="width:${pct}%;
                           background:linear-gradient(90deg,${color},${color}88);">
                </div>
            </div>
            <div class="text-muted mt-4" style="font-size:11px;">
                ${streak === 0
                    ? "Streak broken — start today!"
                    : `🧊 ${habit.freezeCredits} freeze credit${habit.freezeCredits !== 1 ? "s" : ""} remaining`}
            </div>
        `;
        container.appendChild(card);
    });
}

/* ─────────────────────────────────────
   ANALYTICS — PER HABIT SUCCESS RATES
───────────────────────────────────── */
function renderHabitSuccessRates() {
    const container = document.getElementById("habitSuccessRates");
    if (!container) return;

    if (habits.length === 0) {
        container.innerHTML = `<p class="empty-text">No habits yet.</p>`;
        return;
    }

    container.innerHTML = "";

    const today   = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    habits.forEach(habit => {
        const recentDone = habit.completedDates
            .filter(d => new Date(d) >= weekAgo).length;
        const pct = Math.min(Math.round((recentDone / 7) * 100), 100);

        let color = "#6366f1";
        if (pct >= 80)      color = "#22c55e";
        else if (pct >= 50) color = "#eab308";
        else                color = "#ef4444";

        container.innerHTML += `
            <div style="margin-bottom:14px;">
                <div style="display:flex; justify-content:space-between;
                            font-size:13px; margin-bottom:4px;">
                    <span>${habit.name}</span>
                    <span style="color:${color}; font-family:'JetBrains Mono',monospace;">
                        ${pct}%
                    </span>
                </div>
                <div class="prog-wrap">
                    <div class="prog-fill"
                        style="width:${pct}%;
                               background:linear-gradient(90deg,${color},${color}88);">
                    </div>
                </div>
            </div>
        `;
    });
}

/* ─────────────────────────────────────
   SETTINGS WIRING
───────────────────────────────────── */
function setupSettings(user) {
    setEl("settingsEmail", user.email || "Guest");

    // Sidebar avatar
    const avatarEl = document.getElementById("userAvatar");
    const nameEl   = document.getElementById("userNameDisplay");
    if (avatarEl) avatarEl.textContent = (user.email || "G")[0].toUpperCase();
    if (nameEl)   nameEl.textContent   = user.email
        ? user.email.split("@")[0] : "Guest";

    // Logout
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        localStorage.removeItem("currentUser");
        window.location.href = "login.html";
    });

    // Export
    document.getElementById("exportBtn")?.addEventListener("click", () => {
        const blob = new Blob(
            [JSON.stringify(habits, null, 2)],
            { type: "application/json" }
        );
        const a    = document.createElement("a");
        a.href     = URL.createObjectURL(blob);
        a.download = "pps-habits.json";
        a.click();
        URL.revokeObjectURL(a.href);
    });

    // Reset
    document.getElementById("resetBtn")?.addEventListener("click", () => {
        if (confirm("Reset ALL data? This cannot be undone.")) {
            habits = [];
            saveHabits();
            renderHabits();
            renderDashboard();
            renderDailyTracker();
            renderStreakSection();
            alert("All data reset.");
        }
    });

    // Storage used
    const bytes = new Blob([localStorage.getItem(storageKey) || ""]).size;
    setEl("storageUsed", `~${(bytes / 1024).toFixed(1)} KB`);
}

/* ─────────────────────────────────────
   DATE DISPLAY
───────────────────────────────────── */
function updateDateDisplay() {
    const dateStr = new Date().toLocaleDateString(undefined, {
        weekday: "long", year: "numeric",
        month: "long",   day: "numeric"
    });
    setEl("dashboardDate", dateStr);
    setEl("trackerDate",   dateStr);
}

/* ─────────────────────────────────────
   TINY DOM HELPERS — keeps code clean
───────────────────────────────────── */
function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setBar(id, pct, gradient) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = pct + "%";
    if (gradient) el.style.background = gradient;
}