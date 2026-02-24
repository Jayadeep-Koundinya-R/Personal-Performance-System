/* ================= DASHBOARD RENDERING ================= */

function renderDashboard() {
    const criticalList = document.getElementById("criticalList");
    const highList     = document.getElementById("highList");
    const mediumList   = document.getElementById("mediumList");
    const upcomingList = document.getElementById("upcomingList");

    if (!criticalList || !highList || !mediumList || !upcomingList) return;

    // Clear
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

        const isCompletedToday = habit.completedDates.includes(todayStr);

        // ── Status tag class + text ──
        let tagClass  = "tag-upcoming";
        let tagText   = "Due " + dueDate.toLocaleDateString(undefined, { weekday: "long" });

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

        // ── Build task row ──
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

        // checkbox listener
        taskDiv.querySelector("input[type='checkbox']")
            .addEventListener("change", function () {
                updateHabitCompletion(habit, this.checked);
                renderHabits();
                renderDashboard();
            });

        // ── Classify into columns ──
        if (diffDays <= 0) {
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

    // Update all stats
    updateCompletionStats();
    updateProgressWidget();
    updateWeeklyChart();
    updateLevelWidget();
    updateDateDisplay();
}

/* ─────────────────────────────────────
   COMPLETION RATE + FREEZE CREDITS
───────────────────────────────────── */
function updateCompletionStats() {
    const todayStr = new Date().toISOString().split("T")[0];
    const today    = new Date(); today.setHours(0, 0, 0, 0);

    let dueTodayCount      = 0;
    let completedTodayCount = 0;
    let totalFreezeCredits  = 0;
    let totalStreak         = 0;

    habits.forEach(habit => {
        const dueDate = new Date(habit.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = (dueDate - today) / (1000 * 60 * 60 * 24);

        if (diffDays <= 0) {
            dueTodayCount++;
            if (habit.completedDates.includes(todayStr)) completedTodayCount++;
        }

        totalFreezeCredits += habit.freezeCredits || 0;
        totalStreak = Math.max(totalStreak, habit.streak || 0);
    });

    const completionPercent = dueTodayCount > 0
        ? Math.round((completedTodayCount / dueTodayCount) * 100)
        : 0;

    // Completion Rate
    const rateEl = document.getElementById("completionRate");
    if (rateEl) rateEl.textContent = completionPercent + "%";

    // Freeze Credits
    const freezeEl = document.getElementById("freezeCreditsDisplay");
    if (freezeEl) freezeEl.textContent = totalFreezeCredits;

    // Current Streak (highest across habits)
    const streakEl = document.getElementById("currentStreak");
    if (streakEl) streakEl.textContent = "🔥 " + totalStreak;

    // Weekly Points
    const points = calculateWeeklyPoints(habits);
    const weeklyEl = document.getElementById("weeklyPoints");
    if (weeklyEl) weeklyEl.textContent = points;

    // Streak / Analytics section heroes
    const heroStreak = document.getElementById("heroStreak");
    if (heroStreak) heroStreak.textContent = totalStreak;

    const heroFreeze = document.getElementById("heroFreeze");
    if (heroFreeze) heroFreeze.textContent = totalFreezeCredits;

    const heroTotal = document.getElementById("heroTotal");
    if (heroTotal) {
        const total = habits.reduce((sum, h) => sum + h.completedDates.length, 0);
        heroTotal.textContent = total;
    }

    const heroBest = document.getElementById("heroBest");
    if (heroBest) heroBest.textContent = totalStreak;

    // Analytics stats
    const totalXpEl = document.getElementById("totalXP");
    if (totalXpEl) totalXpEl.textContent = calculateTotalXP(habits);

    const totalDoneEl = document.getElementById("totalDone");
    if (totalDoneEl) {
        totalDoneEl.textContent = habits.reduce((s, h) => s + h.completedDates.length, 0);
    }

    const avgEl = document.getElementById("avgCompletion");
    if (avgEl) avgEl.textContent = completionPercent + "%";

    const bestEl = document.getElementById("bestStreak");
    if (bestEl) bestEl.textContent = totalStreak;
}

/* ─────────────────────────────────────
   TODAY'S PROGRESS WIDGET (right col)
───────────────────────────────────── */
function updateProgressWidget() {
    const todayStr = new Date().toISOString().split("T")[0];
    const today    = new Date(); today.setHours(0, 0, 0, 0);

    let due  = 0;
    let done = 0;

    habits.forEach(habit => {
        const dueDate = new Date(habit.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        if ((dueDate - today) / (1000 * 60 * 60 * 24) <= 0) {
            due++;
            if (habit.completedDates.includes(todayStr)) done++;
        }
    });

    const pct = due > 0 ? Math.round((done / due) * 100) : 0;

    // Dashboard right widget
    const progEl  = document.getElementById("todayProgress");
    const barEl   = document.getElementById("todayProgressBar");
    if (progEl) progEl.textContent = `${done}/${due}`;
    if (barEl)  barEl.style.width  = pct + "%";

    // Daily Tracker section header
    const tProg   = document.getElementById("trackerProgress");
    const tBar    = document.getElementById("trackerProgressBar");
    const tPct    = document.getElementById("trackerPercent");
    if (tProg) tProg.textContent = `${done}/${due}`;
    if (tBar)  tBar.style.width  = pct + "%";
    if (tPct)  tPct.textContent  = pct + "% complete";
}

/* ─────────────────────────────────────
   WEEKLY MINI BAR CHART
───────────────────────────────────── */
function updateWeeklyChart() {
    const chartEl = document.getElementById("weeklyChart");
    if (!chartEl) return;

    const days   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const counts = new Array(7).fill(0);
    const maxPossible = habits.length || 1;

    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayIndex = 6 - i;

        habits.forEach(habit => {
            if (habit.completedDates.includes(dateStr)) counts[dayIndex]++;
        });
    }

    const max = Math.max(...counts, 1);

    chartEl.innerHTML = days.map((label, i) => {
        const heightPct = Math.round((counts[i] / max) * 100);
        const isToday   = i === 6;
        const color     = isToday
            ? "linear-gradient(180deg,#22d3ee,#0891b2)"
            : "linear-gradient(180deg,#6366f1,#4338ca)";
        return `
            <div class="bar-col">
                <div class="bar" style="height:${heightPct}%; background:${color};"></div>
                <div class="bar-label">${label}</div>
            </div>
        `;
    }).join("");
}

/* ─────────────────────────────────────
   LEVEL + XP WIDGET
───────────────────────────────────── */
function updateLevelWidget() {
    const xp       = calculateTotalXP(habits);
    const level    = calculateLevel(habits);
    const xpInLevel = xp % 100;
    const xpToNext  = 100 - xpInLevel;

    const lvlEl   = document.getElementById("userLevel");
    const xpEl    = document.getElementById("xpDisplay");
    const xpBar   = document.getElementById("xpBar");
    const xpNext  = document.getElementById("xpToNext");

    if (lvlEl)  lvlEl.textContent  = "Lv. " + level;
    if (xpEl)   xpEl.textContent   = `${xpInLevel} / 100 XP`;
    if (xpBar)  xpBar.style.width  = xpInLevel + "%";
    if (xpNext) xpNext.textContent = `${xpToNext} XP to Level ${level + 1}`;

    // Sidebar user chip
    const sidebarLvl = document.getElementById("userLevelDisplay");
    if (sidebarLvl) sidebarLvl.textContent = `Level ${level} • ${xp} XP`;
}

/* ─────────────────────────────────────
   DATE DISPLAY
───────────────────────────────────── */
function updateDateDisplay() {
    const dateStr = new Date().toLocaleDateString(undefined, {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    const dashDate    = document.getElementById("dashboardDate");
    const trackerDate = document.getElementById("trackerDate");

    if (dashDate)    dashDate.textContent    = dateStr;
    if (trackerDate) trackerDate.textContent = dateStr;
}

/* ─────────────────────────────────────
   DAILY TRACKER SECTION
───────────────────────────────────── */
function renderDailyTracker() {
    const trackerList = document.getElementById("trackerList");
    if (!trackerList) return;

    trackerList.innerHTML = "";

    if (habits.length === 0) {
        trackerList.innerHTML = `<p class="empty-text">No habits yet — add some in Habit Manager.</p>`;
        return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Group habits by category
    const grouped = {};
    habits.forEach(habit => {
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
            const row = document.createElement("div");
            row.className = "task-item";
            row.innerHTML = `
                <div class="task-left">
                    <input type="checkbox" data-id="${habit.id}" ${isCompleted ? "checked" : ""}>
                    <span class="${isCompleted ? "task-done" : ""}">${habit.name}</span>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <span class="status-tag pri-${habit.priority.toLowerCase()}">${habit.priority}</span>
                    <span class="status-tag ${isCompleted ? "tag-done" : "tag-today"}">
                        ${isCompleted ? "+10 XP ✓" : "+10 XP"}
                    </span>
                </div>
            `;

            row.querySelector("input[type='checkbox']")
                .addEventListener("change", function () {
                    updateHabitCompletion(habit, this.checked);
                    renderDailyTracker();
                    updateProgressWidget();
                    updateCompletionStats();
                    updateLevelWidget();
                });

            section.appendChild(row);
        });

        trackerList.appendChild(section);
    });
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
        const best   = Math.max(streak, habit.completedDates.length > 0 ? streak : 0);
        const pct    = Math.min(Math.round((streak / Math.max(best, 1)) * 100), 100);

        let color   = "#6366f1";
        let icon    = "🔥";
        if (streak === 0) { color = "#ef4444"; icon = "💀"; }
        else if (streak >= 7) { color = "#f97316"; }

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-title">${habit.name}</div>
            <div style="font-size:26px; font-weight:700; color:${color}; font-family:'JetBrains Mono',monospace;">
                ${icon} ${streak}
            </div>
            <div class="text-muted" style="font-size:12px; margin-top:4px;">day streak</div>
            <div class="prog-wrap mt-8">
                <div class="prog-fill" style="width:${pct}%; background:linear-gradient(90deg,${color},${color}99);"></div>
            </div>
            <div class="text-muted mt-4" style="font-size:11px;">
                ${streak === 0 ? "Streak broken — start again today!" : `Best: ${streak} days`}
            </div>
        `;
        container.appendChild(card);
    });
}

/* ─────────────────────────────────────
   ANALYTICS — PER HABIT RATES
───────────────────────────────────── */
function renderHabitSuccessRates() {
    const container = document.getElementById("habitSuccessRates");
    if (!container || habits.length === 0) return;

    container.innerHTML = "";

    const today  = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    habits.forEach(habit => {
        const recentDone = habit.completedDates.filter(d => new Date(d) >= weekAgo).length;
        const pct = Math.min(Math.round((recentDone / 7) * 100), 100);

        let color = "#6366f1";
        if (pct >= 80) color = "#22c55e";
        else if (pct >= 50) color = "#eab308";
        else color = "#ef4444";

        container.innerHTML += `
            <div style="margin-bottom:14px;">
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
                    <span>${habit.name}</span>
                    <span style="color:${color};">${pct}%</span>
                </div>
                <div class="prog-wrap">
                    <div class="prog-fill" style="width:${pct}%; background:linear-gradient(90deg,${color},${color}99);"></div>
                </div>
            </div>
        `;
    });
}

/* ─────────────────────────────────────
   SETTINGS — LOGOUT / EXPORT / RESET
───────────────────────────────────── */
function setupSettings(user) {
    // show email
    const emailEl = document.getElementById("settingsEmail");
    if (emailEl) emailEl.textContent = user.email || "Guest";

    // sidebar avatar initial
    const avatarEl = document.getElementById("userAvatar");
    const nameEl   = document.getElementById("userNameDisplay");
    if (avatarEl) avatarEl.textContent = (user.email || "G")[0].toUpperCase();
    if (nameEl)   nameEl.textContent   = user.email ? user.email.split("@")[0] : "Guest";

    // logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("currentUser");
            window.location.href = "login.html";
        });
    }

    // export
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            const data  = JSON.stringify(habits, null, 2);
            const blob  = new Blob([data], { type: "application/json" });
            const url   = URL.createObjectURL(blob);
            const a     = document.createElement("a");
            a.href      = url;
            a.download  = "pps-habits.json";
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // reset
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (confirm("Reset ALL data? This cannot be undone.")) {
                habits = [];
                saveHabits();
                renderHabits();
                renderDashboard();
                alert("Data reset.");
            }
        });
    }

    // storage used
    const storageEl = document.getElementById("storageUsed");
    if (storageEl) {
        const bytes = new Blob([localStorage.getItem(storageKey) || ""]).size;
        storageEl.textContent = `~${(bytes / 1024).toFixed(1)} KB`;
    }
}