/* ================= HABIT STORAGE & MANAGEMENT ================= */

let habits     = [];
let storageKey = "";

/* ─────────────────────────────────────
   INIT & SAVE
───────────────────────────────────── */
function initHabits(user) {
    storageKey = `habits_${user.email || "guest"}`;
    habits     = JSON.parse(localStorage.getItem(storageKey)) || [];
    dailyReset();
    return habits;
}
function saveHabits() {
    localStorage.setItem(storageKey, JSON.stringify(habits));
}

/* ─────────────────────────────────────
   DAILY RESET — runs on every app open
───────────────────────────────────── */
function dailyReset() {
    const today = getToday ? getToday() : (() => { const d=new Date(); d.setHours(0,0,0,0); return d; })();
    let changed = false;

    habits.forEach(habit => {
        if(habit.period === "Today") return;

        const dueDate = new Date(habit.dueDate); dueDate.setHours(0,0,0,0);
        if(dueDate < today) {
            const dueDateStr   = dueDate.toISOString().split("T")[0];
            const wasCompleted = habit.completedDates.includes(dueDateStr);

            if(!wasCompleted && habit.streak > 0) {
                if(habit.freezeCredits > 0) habit.freezeCredits--;
                else                        habit.streak = 0;
            }

            while(dueDate < today) {
                updateNextDueDate(habit);
                dueDate.setTime(new Date(habit.dueDate).getTime());
                dueDate.setHours(0,0,0,0);
            }
            changed = true;
        }
    });
    if(changed) saveHabits();
}

/* ─────────────────────────────────────
   ADD HABIT
───────────────────────────────────── */
function addHabit(name, category, period, priority, startDate) {
    const dueDate = startDate
        ? new Date(startDate + "T12:00:00").toISOString()
        : generateInitialDueDate(period);

    const newHabit = {
        id:                Date.now(),
        name:              name,
        category:          category || "Uncategorized",
        priority:          priority,
        period:            period,
        dueDate:           dueDate,
        completedDates:    [],
        streak:            0,
        lastCompletedDate: null,
        freezeCredits:     2
    };
    habits.push(newHabit);
    saveHabits();
    return newHabit;
}

/* ─────────────────────────────────────
   DELETE
───────────────────────────────────── */
function deleteHabit(id) {
    habits = habits.filter(h => h.id !== id);
    saveHabits();
}

/* ─────────────────────────────────────
   IS HABIT DUE TODAY?
───────────────────────────────────── */
function isHabitDueToday(habit) {
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(habit.dueDate); due.setHours(0,0,0,0);
    return (due - today) / 864e5 <= 0;
}

/* ─────────────────────────────────────
   COMPLETION LOGIC
───────────────────────────────────── */
function updateHabitCompletion(habit, isCompleted) {
    const todayStr = new Date().toISOString().split("T")[0];

    if(isCompleted) {
        if(!habit.completedDates.includes(todayStr))
            habit.completedDates.push(todayStr);

        if(habit.lastCompletedDate) {
            const diff = Math.round(
                (new Date(todayStr) - new Date(habit.lastCompletedDate)) / 864e5
            );
            if(diff === 1)      habit.streak++;
            else if(diff === 0) { /* same day, do nothing */ }
            else                habit.streak = 1; // gap — dailyReset handles freeze
        } else {
            habit.streak = 1;
        }
        habit.lastCompletedDate = todayStr;

    } else {
        habit.completedDates = habit.completedDates.filter(d => d !== todayStr);
        if(habit.completedDates.length > 0) {
            habit.completedDates.sort();
            habit.lastCompletedDate = habit.completedDates[habit.completedDates.length-1];
            habit.streak = calculateStreakFromDates(habit.completedDates);
        } else {
            habit.lastCompletedDate = null;
            habit.streak = 0;
        }
    }
    saveHabits();
}

function calculateStreakFromDates(dates) {
    if(!dates||!dates.length) return 0;
    const sorted = [...dates].sort().reverse();
    let streak = 1;
    for(let i=0; i<sorted.length-1; i++){
        const diff = Math.round((new Date(sorted[i])-new Date(sorted[i+1]))/864e5);
        if(diff===1) streak++;
        else break;
    }
    return streak;
}

/* ─────────────────────────────────────
   FORMAT DATE → DD/MM/YYYY
   The input[type=date] value is always YYYY-MM-DD internally
   (browser standard). We convert for display only.
───────────────────────────────────── */
function formatDateDMY(isoString) {
    if(!isoString) return "—";
    return new Date(isoString).toLocaleDateString("en-GB", {
        day:"2-digit", month:"2-digit", year:"numeric"
    }); // outputs DD/MM/YYYY
}

/* ─────────────────────────────────────
   RENDER HABIT LIST (Habit Manager)
───────────────────────────────────── */
function renderHabits() {
    const habitList  = document.getElementById("habitList");
    const habitCount = document.getElementById("habitCount");
    if(!habitList) return;

    if(habitCount) habitCount.textContent = habits.length;

    if(habits.length === 0) {
        habitList.innerHTML = `<p class="empty-text">No habits yet — add one above.</p>`;
        return;
    }

    habitList.innerHTML = "";
    habits.forEach(habit => {
        const card     = document.createElement("div");
        card.className = "habit-card";

        const priClass = {
            High:"pri-high", Medium:"pri-medium",
            Low:"pri-low",   Optional:"pri-optional"
        }[habit.priority] || "pri-optional";

        card.innerHTML = `
            <div class="habit-info">
                <h4>${habit.name}</h4>
                <div class="habit-meta">
                    ${habit.category}
                    &nbsp;•&nbsp; ${habit.period}
                    &nbsp;•&nbsp; Next due: ${formatDateDMY(habit.dueDate)}
                    &nbsp;•&nbsp; 🔥 ${habit.streak} streak
                </div>
            </div>
            <div class="habit-actions">
                <span class="pri-badge ${priClass}">${habit.priority}</span>
                <button class="ghost-btn  edit-btn"   data-id="${habit.id}">Edit</button>
                <button class="danger-btn delete-btn" data-id="${habit.id}">Delete</button>
            </div>`;

        card.querySelector(".delete-btn").addEventListener("click", () => {
            if(!confirm(`Delete "${habit.name}"?`)) return;
            deleteHabit(habit.id);
            renderHabits(); renderDashboard(); renderDailyTracker();
        });

        // PROFESSIONAL EDIT: opens a modal pre-filled with all habit fields
        card.querySelector(".edit-btn").addEventListener("click", () => {
            openEditModal(habit);
        });

        habitList.appendChild(card);
    });

    document.querySelectorAll("#weeklyPoints").forEach(el => {
        el.textContent = calculateWeeklyPoints(habits);
    });
}

/* ─────────────────────────────────────
   EDIT MODAL — opens with all fields
   Professional pattern: edit in-place modal,
   not a prompt(). Saves on confirm, discards on cancel.
───────────────────────────────────── */
function openEditModal(habit) {
    // Pre-fill fields
    document.getElementById("editHabitId").value       = habit.id;
    document.getElementById("editHabitName").value     = habit.name;
    document.getElementById("editHabitCategory").value = habit.category;
    document.getElementById("editHabitPeriod").value   = habit.period;

    // Convert ISO date to YYYY-MM-DD for the input[type=date]
    const dueDateInput = habit.dueDate
        ? new Date(habit.dueDate).toISOString().split("T")[0]
        : "";
    document.getElementById("editHabitDate").value = dueDateInput;

    // Set priority radio
    const radios = document.querySelectorAll('input[name="editPriority"]');
    radios.forEach(r => { r.checked = r.value === habit.priority; });

    // Open modal
    document.getElementById("editModal").classList.add("open");
}

function closeEditModal() {
    document.getElementById("editModal").classList.remove("open");
}

function setupEditModal() {
    // Close on X button
    document.getElementById("editModalClose")
        ?.addEventListener("click", closeEditModal);

    // Close on backdrop click
    document.getElementById("editModal")
        ?.addEventListener("click", function(e) {
            if(e.target === this) closeEditModal();
        });

    // Save
    document.getElementById("saveEditBtn")
        ?.addEventListener("click", () => {
            const id       = parseInt(document.getElementById("editHabitId").value);
            const name     = document.getElementById("editHabitName").value.trim();
            const category = document.getElementById("editHabitCategory").value.trim();
            const period   = document.getElementById("editHabitPeriod").value;
            const dateVal  = document.getElementById("editHabitDate").value;
            const priority = document.querySelector('input[name="editPriority"]:checked')?.value || "Optional";

            if(!name){ alert("Habit name is required."); return; }

            const habit = habits.find(h => h.id === id);
            if(!habit) return;

            habit.name     = name;
            habit.category = category || "Uncategorized";
            habit.period   = period;
            habit.priority = priority;
            if(dateVal) habit.dueDate = new Date(dateVal+"T12:00:00").toISOString();

            saveHabits();
            renderHabits();
            renderDashboard();
            renderDailyTracker();
            closeEditModal();
        });
}

/* ─────────────────────────────────────
   SETUP ADD HABIT BUTTON
───────────────────────────────────── */
function setupAddHabitButton() {
    const btn = document.getElementById("addHabitBtn");
    if(!btn) return;

    btn.addEventListener("click", () => {
        const name      = document.getElementById("habitName")?.value.trim();
        const category  = document.getElementById("habitCategory")?.value.trim();
        const period    = document.getElementById("habitPeriod")?.value || "Daily";
        const priority  = document.querySelector('input[name="priority"]:checked')?.value || "Optional";
        const startDate = document.getElementById("habitStartDate")?.value || null;

        const errorEl = document.getElementById("habitError");
        if(!name){ if(errorEl) errorEl.style.display="block"; return; }
        if(errorEl) errorEl.style.display = "none";

        addHabit(name, category, period, priority, startDate);
        renderHabits(); renderDashboard(); renderDailyTracker();

        document.getElementById("habitName").value     = "";
        document.getElementById("habitCategory").value = "";
        document.getElementById("habitPeriod").value   = "Daily";
        const sd = document.getElementById("habitStartDate");
        if(sd) sd.value = "";
        const hr = document.querySelector('input[name="priority"][value="High"]');
        if(hr) hr.checked = true;
    });
}