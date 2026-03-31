/**
 * dashboard.js
 * All dashboard UI rendering. Reads from state — never writes to it.
 *
 * ARCHITECTURE NOTE:
 * This module does NOT import from habits.js. It listens for the
 * "habitsUpdated" CustomEvent fired by habits.js and re-renders.
 * This eliminates the circular dependency.
 */

import { getData, saveData } from './storageService.js';
import { CONFIG } from './config.js';
import { getState } from './state.js';
import { isHabitDueToday, updateHabitCompletion } from './habits.js';
import {
    getToday, getTodayStr,
    calculateWeeklyPoints, calculateTotalXP, calculateLevel,
    setEl, setBar
} from './utils.js';

/* ─────────────────────────────────────
   FILTER STATE
   Shared by dashboard stats and analytics.
───────────────────────────────────── */
let currentFilter = "today"; // "today" | "week" | "month"

function isInFilter(dateStr) {
    const date  = new Date(dateStr);
    const today = getToday();

    switch (currentFilter) {
        case "today": {
            return date.toDateString() === today.toDateString();
        }
        case "week": {
            const start = new Date(today);
            start.setDate(today.getDate() - 6);
            return date >= start;
        }
        case "month": {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            return date >= start;
        }
        default: return true;
    }
}

/* ─────────────────────────────────────
   WIRE GLOBAL FILTER DROPDOWN
   Called once from main.js after DOM ready.
───────────────────────────────────── */
export function setupDashboardFilter() {
    const sel = document.getElementById("globalFilter");
    if (!sel) return;
    sel.value = currentFilter;
    sel.addEventListener("change", e => {
        currentFilter = e.target.value;
        renderDashboard();
        updateWeeklyChart();
        renderHeatmap();
    });
}

/* ─────────────────────────────────────
   WIRE ANALYTICS FILTER DROPDOWN
   The analytics section has its own filter select.
───────────────────────────────────── */
export function setupAnalyticsFilter() {
    const sel = document.getElementById("analyticsFilter");
    if (!sel) return;
    sel.addEventListener("change", e => {
        const val = e.target.value;
        // Map analytics dropdown values to shared filter keys
        if      (val === "7")  currentFilter = "week";
        else if (val === "30") currentFilter = "month";
        else                   currentFilter = "all";
        renderHabitSuccessRates();
        updateWeeklyChart();
        updateCompletionStats();
    });
}

/* ─────────────────────────────────────
   MAIN DASHBOARD RENDER
───────────────────────────────────── */
export function renderDashboard() {
    const { habits } = getState();

    const criticalList = document.getElementById("criticalList");
    const highList     = document.getElementById("highList");
    const mediumList   = document.getElementById("mediumList");
    const upcomingList = document.getElementById("upcomingList");
    if (!criticalList) return;

    criticalList.innerHTML = highList.innerHTML =
    mediumList.innerHTML   = upcomingList.innerHTML = "";

    const todayStr = getTodayStr();
    const today    = getToday();

    habits.forEach(habit => {
        const dueDate  = new Date(habit.dueDate); dueDate.setHours(0, 0, 0, 0);
        const diffDays = (dueDate - today) / 864e5;
        const isDueToday       = isHabitDueToday(habit);
        const isCompletedToday = habit.completedDates.includes(todayStr);

        let tagClass = "tag-upcoming";
        let tagText  = "Due " + dueDate.toLocaleDateString(undefined, { weekday: "long" });
        if      (diffDays < 0)   { tagClass = "tag-overdue";  tagText = "Overdue"; }
        else if (diffDays === 0) {
            tagClass = isCompletedToday ? "tag-done"  : "tag-today";
            tagText  = isCompletedToday ? "Done ✓"    : "Due Today";
        }
        else if (diffDays === 1) { tagClass = "tag-tomorrow"; tagText = "Due Tomorrow"; }

        const taskDiv = document.createElement("div");
        taskDiv.className = "task-item";
        taskDiv.innerHTML = `
            <div class="task-left">
                <input type="checkbox" data-id="${habit.id}" ${isCompletedToday ? "checked" : ""}>
                <span class="${isCompletedToday ? "task-done" : ""}">${habit.name}</span>
            </div>
            <span class="status-tag ${tagClass}">${tagText}</span>`;

        taskDiv.querySelector("input[type='checkbox']")
            .addEventListener("change", function () {
                updateHabitCompletion(habit, this.checked);
                // habitsUpdated event will trigger full re-render via main.js
            });

        if (isDueToday)              criticalList.appendChild(taskDiv);
        else if (habit.priority === "High")   highList.appendChild(taskDiv);
        else if (habit.priority === "Medium") mediumList.appendChild(taskDiv);
        else                                  upcomingList.appendChild(taskDiv);
    });

    const empty = (el, msg) => { if (!el.innerHTML) el.innerHTML = `<div class="task-item"><span>${msg}</span></div>`; };
    empty(criticalList, "No critical tasks 🎉");
    empty(highList,     "No high priority tasks");
    empty(mediumList,   "No medium tasks");
    empty(upcomingList, "No upcoming tasks");

    updateAllStats();
}

/* ─────────────────────────────────────
   UPDATE ALL STATS
───────────────────────────────────── */
export function updateAllStats() {
    updateCompletionStats();
    updateProgressWidget();
    updateWeeklyChart();
    updateLevelWidget();
    updateDateDisplay();
}

/* ─────────────────────────────────────
   COMPLETION STATS
───────────────────────────────────── */
export function updateCompletionStats() {
    const { habits } = getState();
    const todayStr = getTodayStr();
    let due = 0, done = 0, freeze = 0, maxStreak = 0;

    habits.forEach(h => {
        if (isHabitDueToday(h)) {
            due++;
            if (h.completedDates.includes(todayStr)) done++;
        }
        freeze    += h.freezeCredits || 0;
        maxStreak  = Math.max(maxStreak, h.streak || 0);
    });

    const pct = due > 0 ? Math.round((done / due) * 100) : 0;

    setEl("completionRate",        pct + "%");
    setEl("freezeCreditsDisplay",  freeze);
    setEl("currentStreak",         "🔥 " + maxStreak);
    setEl("weeklyPoints",          calculateWeeklyPoints(habits));

    // Streak section hero
    setEl("heroStreak", maxStreak);
    setEl("heroFreeze", freeze);
    setEl("heroBest",   maxStreak);
    setEl("heroTotal",  habits.reduce((s, h) => s + h.completedDates.length, 0));

    // Analytics cards
    setEl("avgCompletion", pct + "%");
    setEl("bestStreak",    maxStreak);
    setEl("totalXP",       calculateTotalXP(habits));
    setEl("totalDone",     habits.reduce((s, h) => s + h.completedDates.length, 0));
}

/* ─────────────────────────────────────
   TODAY'S PROGRESS WIDGET
───────────────────────────────────── */
export function updateProgressWidget() {
    const { habits } = getState();
    const todayStr = getTodayStr();
    let due = 0, done = 0;

    habits.forEach(h => {
        if (isHabitDueToday(h)) {
            due++;
            if (h.completedDates.includes(todayStr)) done++;
        }
    });

    const pct = due > 0 ? Math.round((done / due) * 100) : 0;

    setEl("todayProgress",    `${done}/${due}`);
    setBar("todayProgressBar", pct);
    setEl("trackerProgress",  `${done}/${due}`);
    setBar("trackerProgressBar", pct);
    setEl("trackerPercent",   pct + "% complete");
}

/* ─────────────────────────────────────
   WEEKLY SNAPSHOT BAR CHART
───────────────────────────────────── */
export function updateWeeklyChart() {
    const { habits } = getState();
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const counts = new Array(7).fill(0);
    const today  = new Date();

    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const idx     = 6 - i;
        habits.forEach(h => { if (h.completedDates.includes(dateStr)) counts[idx]++; });
    }

    const max    = Math.max(...counts, 1);
    const barHTML = labels.map((label, i) => {
        const h     = Math.max(Math.round((counts[i] / max) * 100), 4);
        const color = i === 6
            ? "linear-gradient(180deg,#22d3ee,#0891b2)"
            : "linear-gradient(180deg,#6366f1,#4338ca)";
        return `<div class="bar-col">
                    <div class="bar" style="height:${h}%;background:${color};"></div>
                    <div class="bar-label">${label}</div>
                </div>`;
    }).join("");

    const dashChart      = document.getElementById("weeklyChart");
    const analyticsChart = document.getElementById("analyticsWeekChart");
    if (dashChart)      dashChart.innerHTML      = barHTML;
    if (analyticsChart) analyticsChart.innerHTML = barHTML;
}

/* ─────────────────────────────────────
   ACTIVITY HEATMAP
───────────────────────────────────── */
export function renderHeatmap() {
    const grid   = document.getElementById("heatmapGrid");
    const months = document.getElementById("heatmapMonths");
    const total  = document.getElementById("heatmapTotal");
    if (!grid) return;

    const { habits } = getState();

    const rangeEl    = document.getElementById("heatmapRange");
    const DAYS       = rangeEl ? parseInt(rangeEl.value) : 182;
    const habitTotal = habits.length || 1;

    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Build date → completion count map
    const countMap = {};
    let grandTotal = 0;
    habits.forEach(h => {
        (h.completedDates || []).forEach(d => {
            countMap[d] = (countMap[d] || 0) + 1;
            grandTotal++;
        });
    });

    // Start from Monday of the week DAYS ago
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - DAYS + 1);
    const dow = startDate.getDay();
    startDate.setDate(startDate.getDate() - (dow === 0 ? 6 : dow - 1));

    let cellsHTML = "";
    const monthsSeen = {};
    const monthCols  = [];
    let col = 0;
    let d   = new Date(startDate);

    while (d <= today) {
        const weekCells = [];
        for (let day = 0; day < 7; day++) {
            if (d > today) {
                weekCells.push('<div class="hm-cell" style="visibility:hidden;"></div>');
            } else {
                const ds    = d.toISOString().split("T")[0];
                const count = countMap[ds] || 0;
                const ratio = count / habitTotal;
                let lv = "";
                if      (count === 0)   lv = "";
                else if (ratio <= 0.25) lv = "l1";
                else if (ratio <= 0.50) lv = "l2";
                else if (ratio <= 0.75) lv = "l3";
                else                    lv = "l4";

                const isToday = ds === today.toISOString().split("T")[0];
                const tip     = ds + (count > 0 ? ` · ${count} habit${count > 1 ? "s" : ""} done` : " · nothing done");
                const outline = isToday ? "outline:2px solid var(--accent2);outline-offset:1px;" : "";
                weekCells.push(`<div class="hm-cell ${lv}" title="${tip}" style="${outline}"></div>`);

                const monthKey = d.getFullYear() + "-" + d.getMonth();
                if (!monthsSeen[monthKey]) {
                    monthsSeen[monthKey] = true;
                    monthCols.push({ label: d.toLocaleString("default", { month: "short" }), col });
                }
            }
            d.setDate(d.getDate() + 1);
        }
        cellsHTML += `<div style="display:flex;flex-direction:column;gap:3px;">${weekCells.join("")}</div>`;
        col++;
    }

    grid.style.display = "flex";
    grid.style.gap     = "3px";
    grid.innerHTML     = cellsHTML;

    if (months) {
        const totalCols = col;
        months.innerHTML = monthCols.map((m, i) => {
            const nextCol = monthCols[i + 1] ? monthCols[i + 1].col : totalCols;
            const w = ((nextCol - m.col) / totalCols * 100).toFixed(1);
            return `<span style="width:${w}%;overflow:hidden;white-space:nowrap;">${m.label}</span>`;
        }).join("");
    }

    if (total) {
        const doneInRange = Object.entries(countMap)
            .filter(([ds]) => new Date(ds) >= startDate)
            .reduce((s, [, v]) => s + v, 0);
        total.textContent = doneInRange + " completions in range";
    }
}

/* ─────────────────────────────────────
   DAILY TRACKER
───────────────────────────────────── */
export function renderDailyTracker() {
    const { habits } = getState();
    const list = document.getElementById("trackerList");
    if (!list) return;
    list.innerHTML = "";

    const todayStr    = getTodayStr();
    const todayHabits = habits.filter(h => isHabitDueToday(h));

    if (todayHabits.length === 0) {
        list.innerHTML = `<p class="empty-text">No habits due today 🎉 Add habits in Habit Manager.</p>`;
        updateProgressWidget();
        return;
    }

    // Group by category
    const grouped = {};
    todayHabits.forEach(h => {
        const c = h.category || "Uncategorized";
        if (!grouped[c]) grouped[c] = [];
        grouped[c].push(h);
    });

    Object.keys(grouped).forEach(cat => {
        const section = document.createElement("div");
        section.className = "card";
        section.style.marginBottom = "16px";

        const title = document.createElement("h3");
        title.textContent = cat;
        section.appendChild(title);

        grouped[cat].forEach(habit => {
            const done     = habit.completedDates.includes(todayStr);
            const priClass = { High: "pri-high", Medium: "pri-medium", Low: "pri-low", Optional: "pri-optional" }[habit.priority] || "pri-optional";

            const row = document.createElement("div");
            row.className = "task-item";
            row.innerHTML = `
                <div class="task-left">
                    <input type="checkbox" data-id="${habit.id}" ${done ? "checked" : ""}>
                    <span class="${done ? "task-done" : ""}">${habit.name}</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <span class="status-tag ${priClass}">${habit.priority}</span>
                    <span class="status-tag ${done ? "tag-done" : "tag-today"}">
                        ${done ? "+10 XP ✓" : "+10 XP"}
                    </span>
                </div>`;

            row.querySelector("input[type='checkbox']")
                .addEventListener("change", function () {
                    updateHabitCompletion(habit, this.checked);
                });

            section.appendChild(row);
        });
        list.appendChild(section);
    });

    updateProgressWidget();
}

/* ─────────────────────────────────────
   STREAK SECTION
───────────────────────────────────── */
export function renderStreakSection() {
    const { habits } = getState();
    const container = document.getElementById("habitStreakList");
    if (!container) return;
    container.innerHTML = "";

    if (habits.length === 0) {
        container.innerHTML = `<p class="empty-text">No habits yet.</p>`;
        return;
    }

    habits.forEach(habit => {
        const streak = habit.streak || 0;
        const pct    = Math.min(streak * 10, 100);
        let color = "#6366f1", icon = "🔥";
        if (streak === 0)   { color = "#ef4444"; icon = "💀"; }
        else if (streak >= 7) { color = "#f97316"; }

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div style="font-size:11px;font-weight:600;color:var(--muted);
                        text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">
                ${habit.name}
            </div>
            <div style="font-size:26px;font-weight:700;color:${color};
                        font-family:'JetBrains Mono',monospace;">
                ${icon} ${streak}
            </div>
            <div class="text-muted" style="font-size:12px;margin-top:4px;">day streak</div>
            <div class="prog-wrap mt-8">
                <div class="prog-fill" style="width:${pct}%;background:linear-gradient(90deg,${color},${color}88);"></div>
            </div>
            <div style="display:flex;justify-content:space-between;
                        font-size:11px;color:var(--muted);margin-top:6px;">
                <span>${habit.category || "—"} • ${habit.period}</span>
                <span>🧊 ${habit.freezeCredits} freeze</span>
            </div>
            <div style="font-size:11px;margin-top:4px;color:${streak === 0 ? "var(--red)" : "var(--muted)"};">
                ${streak === 0 ? "Start today to build your streak!" : "Keep going — don't break it!"}
            </div>`;
        container.appendChild(card);
    });
}

/* ─────────────────────────────────────
   ANALYTICS — PER HABIT SUCCESS RATES
   Respects the analytics filter dropdown.
───────────────────────────────────── */
export function renderHabitSuccessRates() {
    const { habits } = getState();
    const container = document.getElementById("habitSuccessRates");
    if (!container) return;

    if (habits.length === 0) {
        container.innerHTML = `<p class="empty-text">No habits yet.</p>`;
        return;
    }
    container.innerHTML = "";

    // Determine date range from currentFilter
    const today  = new Date();
    let   cutoff = new Date(today);
    let   days   = 7;

    if      (currentFilter === "week")  { cutoff.setDate(today.getDate() - 7);  days = 7;  }
    else if (currentFilter === "month") { cutoff = new Date(today.getFullYear(), today.getMonth(), 1); days = today.getDate(); }
    else if (currentFilter === "all")   { cutoff = new Date(0); days = Math.max(1, Math.ceil((today - cutoff) / 864e5)); }
    else                                { cutoff.setDate(today.getDate() - 7);  days = 7;  } // default: week

    habits.forEach(h => {
        const done = h.completedDates.filter(d => new Date(d) >= cutoff).length;
        const pct  = Math.min(Math.round((done / days) * 100), 100);
        const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";

        container.innerHTML += `
            <div style="margin-bottom:14px;">
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                    <span>${h.name}</span>
                    <span style="color:${color};font-family:'JetBrains Mono',monospace;">${pct}%</span>
                </div>
                <div class="prog-wrap">
                    <div class="prog-fill" style="width:${pct}%;background:linear-gradient(90deg,${color},${color}88);"></div>
                </div>
            </div>`;
    });
}

/* ─────────────────────────────────────
   LEVEL + XP WIDGET
───────────────────────────────────── */
export function updateLevelWidget() {
    const { habits } = getState();
    const xp        = calculateTotalXP(habits);
    const level     = calculateLevel(habits);
    const xpInLevel = xp % 100;

    setEl("userLevel",        "Lv. " + level);
    setEl("xpDisplay",        `${xpInLevel} / 100 XP`);
    setBar("xpBar",           xpInLevel, "linear-gradient(90deg,#f97316,#fbbf24)");
    setEl("xpToNext",         `${100 - xpInLevel} XP to Level ${level + 1}`);
    setEl("userLevelDisplay", `Level ${level} • ${xp} XP`);
}

/* ─────────────────────────────────────
   DATE DISPLAY
───────────────────────────────────── */
export function updateDateDisplay() {
    const { habits } = getState();
    const dateStr = new Date().toLocaleDateString(undefined, {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
    const activeCount = habits.filter(h => isHabitDueToday(h)).length;
    const chipHtml = `<span class="habits-active-chip">${activeCount} habit${activeCount !== 1 ? "s" : ""} active</span>`;

    const dashDate = document.getElementById("dashboardDate");
    if (dashDate) dashDate.innerHTML = dateStr + chipHtml;

    const trackerDate = document.getElementById("trackerDate");
    if (trackerDate) trackerDate.textContent = dateStr;
}

/* ─────────────────────────────────────
   SETTINGS WIRING
───────────────────────────────────── */
export function setupSettings(user) {
    const { habits } = getState();

    setEl("settingsEmail", user.email || "Guest");

    const storedName  = getData(`pps_name_${user.email || "guest"}`, "");
    const displayName = storedName || (user.email ? user.email.split("@")[0] : "Guest");

    const avatarEl = document.getElementById("userAvatar");
    if (avatarEl) avatarEl.textContent = displayName[0].toUpperCase();
    setEl("userNameDisplay", displayName);

    const nameInput = document.getElementById("settingsName");
    if (nameInput) nameInput.value = displayName;

    document.getElementById("saveNameBtn")?.addEventListener("click", () => {
        const newName = document.getElementById("settingsName")?.value.trim();
        if (!newName) { alert("Name cannot be empty."); return; }
        saveData(`pps_name_${user.email || "guest"}`, newName);
        setEl("userNameDisplay", newName);
        if (avatarEl) avatarEl.textContent = newName[0].toUpperCase();
        _showSettingsMsg("Name saved!", "success");
    });

    document.getElementById("changePasswordBtn")?.addEventListener("click", async () => {
        const current = document.getElementById("currentPassword")?.value;
        const newPass = document.getElementById("newPassword")?.value;
        const confirm = document.getElementById("confirmPassword")?.value;

        if (!current || !newPass || !confirm) { _showSettingsMsg("Fill in all password fields."); return; }
        if (newPass.length < 6)               { _showSettingsMsg("New password must be at least 6 characters."); return; }
        if (newPass !== confirm)               { _showSettingsMsg("Passwords do not match."); return; }

        // Import hashPassword lazily to avoid circular deps
        const { hashPassword } = await import('./auth.js');
        const hashedCurrent = await hashPassword(current);
        const hashedNew     = await hashPassword(newPass);

        const { getData: gd, saveData: sd } = await import('./storageService.js');
        const users = gd("pps_users", []);
        const idx   = users.findIndex(u => u.email === user.email && u.password === hashedCurrent);
        if (idx === -1) { _showSettingsMsg("Current password is incorrect."); return; }

        users[idx].password = hashedNew;
        sd("pps_users", users);

        ["currentPassword", "newPassword", "confirmPassword"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        _showSettingsMsg("Password changed successfully!", "success");
    });

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        import('./storageService.js').then(({ removeData }) => {
            removeData("currentUser");
            window.location.href = "login.html";
        });
    });

    document.getElementById("exportBtn")?.addEventListener("click", () => {
        const { habits: h } = getState();
        const blob = new Blob([JSON.stringify(h, null, 2)], { type: "application/json" });
        const a    = document.createElement("a");
        a.href     = URL.createObjectURL(blob);
        a.download = "pps-habits.json";
        a.click();
        URL.revokeObjectURL(a.href);
    });

    document.getElementById("resetBtn")?.addEventListener("click", () => {
        if (!confirm("Reset ALL data? This cannot be undone.")) return;
        import('./state.js').then(({ updateState }) => {
            import('./storageService.js').then(({ saveData: sd }) => {
                const { storageKey } = getState();
                updateState({ habits: [] });
                sd(storageKey, []);
                document.dispatchEvent(new CustomEvent("habitsUpdated"));
                _showSettingsMsg("All data reset.", "success");
            });
        });
    });

    // Storage used
    import('./storageService.js').then(({ getStorageSize }) => {
        const bytes = getStorageSize();
        setEl("storageUsed", `~${(bytes / 1024).toFixed(1)} KB`);
    });
}

function _showSettingsMsg(text, type = "error") {
    const el = document.getElementById("settingsMsg");
    if (!el) return;
    el.textContent   = text;
    el.className     = `msg ${type}`;
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, 3000);
}
