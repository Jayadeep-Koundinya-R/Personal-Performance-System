/* ================= DASHBOARD RENDERING ================= */

/* ─────────────────────────────────────
   MAIN RENDER
───────────────────────────────────── */
function renderDashboard() {
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
        const dueDate  = new Date(habit.dueDate); dueDate.setHours(0,0,0,0);
        const diffDays = (dueDate - today) / 864e5;
        const isDueToday       = isHabitDueToday(habit);
        const isCompletedToday = habit.completedDates.includes(todayStr);

        // Tag
        let tagClass = "tag-upcoming";
        let tagText  = "Due " + dueDate.toLocaleDateString(undefined,{weekday:"long"});
        if      (diffDays < 0)        { tagClass="tag-overdue";  tagText="Overdue"; }
        else if (diffDays === 0)      { tagClass = isCompletedToday ? "tag-done" : "tag-today";
                                        tagText  = isCompletedToday ? "Done ✓"  : "Due Today"; }
        else if (diffDays === 1)      { tagClass="tag-tomorrow"; tagText="Due Tomorrow"; }

        const taskDiv = document.createElement("div");
        taskDiv.className = "task-item";
        taskDiv.innerHTML = `
            <div class="task-left">
                <input type="checkbox" data-id="${habit.id}" ${isCompletedToday?"checked":""}>
                <span class="${isCompletedToday?"task-done":""}">${habit.name}</span>
            </div>
            <span class="status-tag ${tagClass}">${tagText}</span>
        `;

        taskDiv.querySelector("input[type='checkbox']")
            .addEventListener("change", function(){
                updateHabitCompletion(habit, this.checked);
                renderDashboard();
                renderDailyTracker();
                updateAllStats();
            });

        if (isDueToday) {
            criticalList.appendChild(taskDiv);
        } else {
            switch(habit.priority){
                case "High":   highList.appendChild(taskDiv);    break;
                case "Medium": mediumList.appendChild(taskDiv);  break;
                default:       upcomingList.appendChild(taskDiv);
            }
        }
    });

    if(!criticalList.innerHTML) criticalList.innerHTML=`<div class="task-item"><span>No critical tasks 🎉</span></div>`;
    if(!highList.innerHTML)     highList.innerHTML    =`<div class="task-item"><span>No high priority tasks</span></div>`;
    if(!mediumList.innerHTML)   mediumList.innerHTML  =`<div class="task-item"><span>No medium tasks</span></div>`;
    if(!upcomingList.innerHTML) upcomingList.innerHTML=`<div class="task-item"><span>No upcoming tasks</span></div>`;

    updateAllStats();
}

/* ─────────────────────────────────────
   UPDATE ALL STATS AT ONCE
───────────────────────────────────── */
function updateAllStats() {
    updateCompletionStats();
    updateProgressWidget();
    updateWeeklyChart();
    updateLevelWidget();
    updateDateDisplay();
}

/* ─────────────────────────────────────
   COMPLETION STATS
   FREEZE CREDIT LOGIC EXPLAINED:
   - Each habit starts with 2 freeze credits
   - If you MISS a day (dailyReset detects it), 1 credit is burned to save streak
   - If 0 credits left and you miss → streak resets to 0
   - Credits are PER HABIT — not shared
   - Credits do NOT recover (for now — future feature)
───────────────────────────────────── */
function updateCompletionStats() {
    const todayStr = getTodayStr();
    let due=0, done=0, freeze=0, maxStreak=0;

    habits.forEach(h => {
        if(isHabitDueToday(h)){
            due++;
            if(h.completedDates.includes(todayStr)) done++;
        }
        freeze    += h.freezeCredits || 0;
        maxStreak  = Math.max(maxStreak, h.streak || 0);
    });

    const pct = due > 0 ? Math.round((done/due)*100) : 0;

    setEl("completionRate",       pct + "%");
    setEl("freezeCreditsDisplay", freeze);
    setEl("currentStreak",        "🔥 " + maxStreak);
    setEl("weeklyPoints",         calculateWeeklyPoints(habits));

    // Streak section
    setEl("heroStreak", maxStreak);
    setEl("heroFreeze", freeze);
    setEl("heroBest",   maxStreak);
    setEl("heroTotal",  habits.reduce((s,h)=>s+h.completedDates.length, 0));

    // Analytics
    setEl("avgCompletion", pct + "%");
    setEl("bestStreak",    maxStreak);
    setEl("totalXP",       calculateTotalXP(habits));
    setEl("totalDone",     habits.reduce((s,h)=>s+h.completedDates.length,0));
}

/* ─────────────────────────────────────
   TODAY'S PROGRESS WIDGET
───────────────────────────────────── */
function updateProgressWidget() {
    const todayStr = getTodayStr();
    let due=0, done=0;
    habits.forEach(h => {
        if(isHabitDueToday(h)){ due++; if(h.completedDates.includes(todayStr)) done++; }
    });
    const pct = due>0 ? Math.round((done/due)*100) : 0;

    setEl("todayProgress",  `${done}/${due}`);
    setBar("todayProgressBar", pct);
    setEl("trackerProgress", `${done}/${due}`);
    setBar("trackerProgressBar", pct);
    setEl("trackerPercent",  pct + "% complete");
}

/* ─────────────────────────────────────
   WEEKLY SNAPSHOT BAR CHART
   What it shows: how many habits you completed
   on each of the last 7 days (Mon→today).
   Bar height = completions that day / max any day.
   Today's bar is cyan, past days are purple.
───────────────────────────────────── */
function updateWeeklyChart() {
    const chartEl = document.getElementById("weeklyChart");
    if (!chartEl) return;

    const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const counts = new Array(7).fill(0);
    const today  = new Date();

    for(let i=6; i>=0; i--){
        const d = new Date(today);
        d.setDate(today.getDate()-i);
        const dateStr = d.toISOString().split("T")[0];
        const idx     = 6-i;
        habits.forEach(h => { if(h.completedDates.includes(dateStr)) counts[idx]++; });
    }

    const max = Math.max(...counts, 1);
    chartEl.innerHTML = labels.map((label,i) => {
        const h      = Math.max(Math.round((counts[i]/max)*100), 4);
        const color  = i===6
            ? "linear-gradient(180deg,#22d3ee,#0891b2)"
            : "linear-gradient(180deg,#6366f1,#4338ca)";
        return `
            <div class="bar-col">
                <div class="bar" style="height:${h}%;background:${color};"></div>
                <div class="bar-label">${label}</div>
            </div>`;
    }).join("");
}

/* ─────────────────────────────────────
   DAILY TRACKER SECTION
   Only shows habits due today (isHabitDueToday)
   grouped by category
───────────────────────────────────── */
function renderDailyTracker() {
    const list = document.getElementById("trackerList");
    if (!list) return;
    list.innerHTML = "";

    const todayStr    = getTodayStr();
    const todayHabits = habits.filter(h => isHabitDueToday(h));

    if(todayHabits.length === 0){
        list.innerHTML = `<p class="empty-text">No habits due today 🎉 Add habits in Habit Manager.</p>`;
        updateProgressWidget();
        return;
    }

    // Group by category
    const grouped = {};
    todayHabits.forEach(h => {
        const c = h.category || "Uncategorized";
        if(!grouped[c]) grouped[c] = [];
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
            const done = habit.completedDates.includes(todayStr);
            const priClass = { High:"pri-high", Medium:"pri-medium", Low:"pri-low", Optional:"pri-optional" }[habit.priority] || "pri-optional";

            const row = document.createElement("div");
            row.className = "task-item";
            row.innerHTML = `
                <div class="task-left">
                    <input type="checkbox" data-id="${habit.id}" ${done?"checked":""}>
                    <span class="${done?"task-done":""}">${habit.name}</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <span class="status-tag ${priClass}">${habit.priority}</span>
                    <span class="status-tag ${done?"tag-done":"tag-today"}">
                        ${done?"+10 XP ✓":"+10 XP"}
                    </span>
                </div>`;

            row.querySelector("input[type='checkbox']")
                .addEventListener("change", function(){
                    updateHabitCompletion(habit, this.checked);
                    renderDailyTracker();
                    updateAllStats();
                });
            section.appendChild(row);
        });
        list.appendChild(section);
    });

    updateProgressWidget();
}

/* ─────────────────────────────────────
   STREAK SECTION
   Shows each habit individually with its
   own streak, progress bar, and freeze info
───────────────────────────────────── */
function renderStreakSection() {
    const container = document.getElementById("habitStreakList");
    if(!container) return;
    container.innerHTML = "";

    if(habits.length === 0){
        container.innerHTML = `<p class="empty-text">No habits yet.</p>`;
        return;
    }

    habits.forEach(habit => {
        const streak = habit.streak || 0;
        const pct    = Math.min(streak*10, 100); // full bar at 10 days

        let color = "#6366f1", icon = "🔥";
        if(streak === 0)    { color="#ef4444"; icon="💀"; }
        else if(streak>=7)  { color="#f97316"; }

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
                <div class="prog-fill"
                    style="width:${pct}%;
                           background:linear-gradient(90deg,${color},${color}88);">
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;
                        font-size:11px;color:var(--muted);margin-top:6px;">
                <span>${habit.category || "—"} • ${habit.period}</span>
                <span>🧊 ${habit.freezeCredits} freeze</span>
            </div>
            <div style="font-size:11px;margin-top:4px;color:${streak===0?"var(--red)":"var(--muted)"};">
                ${streak===0?"Start today to build your streak!":"Keep going — don't break it!"}
            </div>`;
        container.appendChild(card);
    });
}

/* ─────────────────────────────────────
   ANALYTICS — PER HABIT SUCCESS RATES
───────────────────────────────────── */
function renderHabitSuccessRates() {
    const container = document.getElementById("habitSuccessRates");
    if(!container) return;

    if(habits.length === 0){
        container.innerHTML = `<p class="empty-text">No habits yet.</p>`;
        return;
    }
    container.innerHTML = "";

    const today   = new Date();
    const weekAgo = new Date(); weekAgo.setDate(today.getDate()-7);

    habits.forEach(h => {
        const done = h.completedDates.filter(d=>new Date(d)>=weekAgo).length;
        const pct  = Math.min(Math.round((done/7)*100),100);
        let color  = pct>=80 ? "#22c55e" : pct>=50 ? "#eab308" : "#ef4444";

        container.innerHTML += `
            <div style="margin-bottom:14px;">
                <div style="display:flex;justify-content:space-between;
                            font-size:13px;margin-bottom:4px;">
                    <span>${h.name}</span>
                    <span style="color:${color};font-family:'JetBrains Mono',monospace;">${pct}%</span>
                </div>
                <div class="prog-wrap">
                    <div class="prog-fill"
                        style="width:${pct}%;background:linear-gradient(90deg,${color},${color}88);">
                    </div>
                </div>
            </div>`;
    });
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
    setBar("xpBar",     xpInLevel, "linear-gradient(90deg,#f97316,#fbbf24)");
    setEl("xpToNext",   `${100-xpInLevel} XP to Level ${level+1}`);
    setEl("userLevelDisplay", `Level ${level} • ${xp} XP`);
}

/* ─────────────────────────────────────
   DATE DISPLAY
   FIX: shows "· X habits active" chip next to date
───────────────────────────────────── */
function updateDateDisplay() {
    const dateStr = new Date().toLocaleDateString(undefined,{
        weekday:"long", year:"numeric", month:"long", day:"numeric"
    });
    const activeCount = habits.filter(h => isHabitDueToday(h)).length;
    const chipHtml = `<span class="habits-active-chip">${activeCount} habit${activeCount!==1?"s":""} active</span>`;

    const dashDate = document.getElementById("dashboardDate");
    if(dashDate) dashDate.innerHTML = dateStr + chipHtml;

    const trackerDate = document.getElementById("trackerDate");
    if(trackerDate) trackerDate.textContent = dateStr;
}

/* ─────────────────────────────────────
   SETTINGS WIRING
───────────────────────────────────── */
function setupSettings(user) {
    // Email display
    setEl("settingsEmail", user.email || "Guest");

    // Display Name — read from localStorage or derive from email
    const storedName = localStorage.getItem(`pps_name_${user.email||"guest"}`) || "";
    const displayName = storedName || (user.email ? user.email.split("@")[0] : "Guest");

    // Sidebar
    const avatarEl = document.getElementById("userAvatar");
    if(avatarEl) avatarEl.textContent = displayName[0].toUpperCase();
    setEl("userNameDisplay", displayName);

    // Settings name field
    const nameInput = document.getElementById("settingsName");
    if(nameInput) nameInput.value = displayName;

    // Save name
    document.getElementById("saveNameBtn")?.addEventListener("click", () => {
        const newName = document.getElementById("settingsName")?.value.trim();
        if(!newName){ alert("Name cannot be empty."); return; }
        localStorage.setItem(`pps_name_${user.email||"guest"}`, newName);
        setEl("userNameDisplay", newName);
        if(avatarEl) avatarEl.textContent = newName[0].toUpperCase();
        showSettingsMsg("Name saved!", "success");
    });

    // Change password
    document.getElementById("changePasswordBtn")?.addEventListener("click", () => {
        const current  = document.getElementById("currentPassword")?.value;
        const newPass  = document.getElementById("newPassword")?.value;
        const confirm  = document.getElementById("confirmPassword")?.value;

        if(!current||!newPass||!confirm){ showSettingsMsg("Fill in all password fields."); return; }
        if(newPass.length<6){ showSettingsMsg("New password must be at least 6 characters."); return; }
        if(newPass!==confirm){ showSettingsMsg("Passwords do not match."); return; }

        const users = JSON.parse(localStorage.getItem("pps_users")||"[]");
        const idx   = users.findIndex(u=>u.email===user.email&&u.password===current);
        if(idx===-1){ showSettingsMsg("Current password is incorrect."); return; }

        users[idx].password = newPass;
        localStorage.setItem("pps_users", JSON.stringify(users));

        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value     = "";
        document.getElementById("confirmPassword").value = "";
        showSettingsMsg("Password changed successfully!", "success");
    });

    // Logout
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        localStorage.removeItem("currentUser");
        window.location.href = "login.html";
    });

    // Export
    document.getElementById("exportBtn")?.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(habits,null,2)],{type:"application/json"});
        const a    = document.createElement("a");
        a.href     = URL.createObjectURL(blob);
        a.download = "pps-habits.json";
        a.click(); URL.revokeObjectURL(a.href);
    });

    // Reset
    document.getElementById("resetBtn")?.addEventListener("click", () => {
        if(!confirm("Reset ALL data? This cannot be undone.")) return;
        habits = []; saveHabits();
        renderHabits(); renderDashboard();
        renderDailyTracker(); renderStreakSection();
        showSettingsMsg("All data reset.", "success");
    });

    // Storage
    const bytes = new Blob([localStorage.getItem(storageKey)||""]).size;
    setEl("storageUsed", `~${(bytes/1024).toFixed(1)} KB`);
}

function showSettingsMsg(text, type="error") {
    const el = document.getElementById("settingsMsg");
    if(!el) return;
    el.textContent   = text;
    el.className     = `msg ${type}`;
    el.style.display = "block";
    setTimeout(()=>{ el.style.display="none"; }, 3000);
}

/* ─────────────────────────────────────
   TINY DOM HELPERS
───────────────────────────────────── */
function setEl(id, value) {
    const el = document.getElementById(id);
    if(el) el.textContent = value;
}
function setBar(id, pct, gradient) {
    const el = document.getElementById(id);
    if(!el) return;
    el.style.width = pct + "%";
    if(gradient) el.style.background = gradient;
}
function getTodayStr() { return new Date().toISOString().split("T")[0]; }
function getToday()    { const d=new Date(); d.setHours(0,0,0,0); return d; }