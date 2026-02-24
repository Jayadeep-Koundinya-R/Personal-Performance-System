/* ================= HABIT STORAGE & MANAGEMENT ================= */

let habits     = [];
let storageKey = "";

/* ─────────────────────────────────────
   INIT & SAVE
───────────────────────────────────── */
function initHabits(user) {
    storageKey = `habits_${user.email || "guest"}`;
    habits     = JSON.parse(localStorage.getItem(storageKey)) || [];

    // Professional pattern: advance due dates on every app open
    dailyReset();

    return habits;
}

function saveHabits() {
    localStorage.setItem(storageKey, JSON.stringify(habits));
}

/* ─────────────────────────────────────
   DAILY RESET
   Runs on app load. Advances due dates for habits whose
   period has passed. This keeps scheduling separate from
   completion — the same approach used by Habitica, Streaks, Done.
───────────────────────────────────── */
function dailyReset() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let changed = false;

    habits.forEach(habit => {
        if (habit.period === "Today") return; // one-time, never resets

        const dueDate = new Date(habit.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        // Only act if due date is strictly in the past (not today)
        if (dueDate < today) {
            const dueDateStr = dueDate.toISOString().split("T")[0];
            const wasCompleted = habit.completedDates.includes(dueDateStr);

            // If missed and had a streak → freeze or reset
            if (!wasCompleted && habit.streak > 0) {
                if (habit.freezeCredits > 0) {
                    habit.freezeCredits -= 1;
                } else {
                    habit.streak = 0;
                }
            }

            // Advance dueDate forward until it reaches today or future
            // Handles multi-day gaps if app wasn't opened
            while (dueDate < today) {
                updateNextDueDate(habit);
                dueDate.setTime(new Date(habit.dueDate).getTime());
                dueDate.setHours(0, 0, 0, 0);
            }

            changed = true;
        }
    });

    if (changed) saveHabits();
}

/* ─────────────────────────────────────
   ADD HABIT
───────────────────────────────────── */
function addHabit(name, category, period, priority, startDate) {
    let dueDate;
    if (startDate) {
        // User picked a custom date — set to noon to avoid timezone issues
        dueDate = new Date(startDate + "T12:00:00").toISOString();
    } else {
        dueDate = generateInitialDueDate(period);
    }

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
   Single source of truth used by dashboard + tracker
───────────────────────────────────── */
function isHabitDueToday(habit) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due   = new Date(habit.dueDate); due.setHours(0, 0, 0, 0);
    return (due - today) / (1000 * 60 * 60 * 24) <= 0;
}

/* ─────────────────────────────────────
   COMPLETION LOGIC
   KEY FIX: updateNextDueDate is NOT called here.
   Due date only advances in dailyReset() on next app open.
   Completion and scheduling are two separate concerns.
───────────────────────────────────── */
function updateHabitCompletion(habit, isCompleted) {
    const todayStr = new Date().toISOString().split("T")[0];

    if (isCompleted) {
        if (!habit.completedDates.includes(todayStr)) {
            habit.completedDates.push(todayStr);
        }

        // Streak logic
        if (habit.lastCompletedDate) {
            const diffDays = Math.round(
                (new Date(todayStr) - new Date(habit.lastCompletedDate))
                / (1000 * 60 * 60 * 24)
            );

            if (diffDays === 1) {
                habit.streak += 1;
            } else if (diffDays === 0) {
                // same day re-check — do nothing
            } else {
                // gap — freeze already handled in dailyReset,
                // but handle first check after a break in same session
                habit.streak = 1;
            }
        } else {
            habit.streak = 1;
        }

        habit.lastCompletedDate = todayStr;

    } else {
        // Uncheck
        habit.completedDates = habit.completedDates.filter(d => d !== todayStr);

        if (habit.completedDates.length > 0) {
            habit.completedDates.sort();
            habit.lastCompletedDate =
                habit.completedDates[habit.completedDates.length - 1];
            habit.streak = calculateStreakFromDates(habit.completedDates);
        } else {
            habit.lastCompletedDate = null;
            habit.streak            = 0;
        }
    }

    saveHabits();
}

/* ─────────────────────────────────────
   RECALCULATE STREAK FROM DATES ARRAY
   Used when unchecking to get accurate count
───────────────────────────────────── */
function calculateStreakFromDates(completedDates) {
    if (!completedDates || completedDates.length === 0) return 0;

    const sorted = [...completedDates].sort().reverse(); // newest first
    let streak   = 1;

    for (let i = 0; i < sorted.length - 1; i++) {
        const diff = Math.round(
            (new Date(sorted[i]) - new Date(sorted[i + 1]))
            / (1000 * 60 * 60 * 24)
        );
        if (diff === 1) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

/* ─────────────────────────────────────
   RENDER HABIT LIST (Habit Manager)
───────────────────────────────────── */
function renderHabits() {
    const habitList  = document.getElementById("habitList");
    const habitCount = document.getElementById("habitCount");

    if (!habitList) return;

    if (habitCount) habitCount.textContent = habits.length;

    if (habits.length === 0) {
        habitList.innerHTML = `<p class="empty-text">No habits yet — add one above.</p>`;
        return;
    }

    habitList.innerHTML = "";

    habits.forEach(habit => {
        const card = document.createElement("div");
        card.className = "habit-card";

        const priClass = {
            "High":     "pri-high",
            "Medium":   "pri-medium",
            "Low":      "pri-low",
            "Optional": "pri-optional"
        }[habit.priority] || "pri-optional";

        const dueDateLabel = new Date(habit.dueDate)
            .toLocaleDateString(undefined, {
                month: "short", day: "numeric", year: "numeric"
            });

        card.innerHTML = `
            <div class="habit-info">
                <h4>${habit.name}</h4>
                <div class="habit-meta">
                    ${habit.category}
                    &nbsp;•&nbsp; ${habit.period}
                    &nbsp;•&nbsp; Next due: ${dueDateLabel}
                    &nbsp;•&nbsp; 🔥 ${habit.streak} streak
                </div>
            </div>
            <div class="habit-actions">
                <span class="pri-badge ${priClass}">${habit.priority}</span>
                <button class="ghost-btn edit-btn"    data-id="${habit.id}">Edit</button>
                <button class="danger-btn delete-btn" data-id="${habit.id}">Delete</button>
            </div>
        `;

        card.querySelector(".delete-btn").addEventListener("click", () => {
            if (confirm(`Delete "${habit.name}"?`)) {
                deleteHabit(habit.id);
                renderHabits();
                renderDashboard();
                renderDailyTracker();
            }
        });

        card.querySelector(".edit-btn").addEventListener("click", () => {
            const newName = prompt("Edit habit name:", habit.name);
            if (newName && newName.trim()) {
                habit.name = newName.trim();
                saveHabits();
                renderHabits();
                renderDashboard();
            }
        });

        habitList.appendChild(card);
    });

    document.querySelectorAll("#weeklyPoints").forEach(el => {
        el.textContent = calculateWeeklyPoints(habits);
    });
}

/* ─────────────────────────────────────
   SETUP ADD HABIT BUTTON
───────────────────────────────────── */
function setupAddHabitButton() {
    const btn = document.getElementById("addHabitBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        const name      = document.getElementById("habitName")?.value.trim();
        const category  = document.getElementById("habitCategory")?.value.trim();
        const period    = document.getElementById("habitPeriod")?.value || "Daily";
        const priority  = document.querySelector('input[name="priority"]:checked')?.value || "Optional";
        const startDate = document.getElementById("habitStartDate")?.value || null;

        const errorEl = document.getElementById("habitError");
        if (!name) {
            if (errorEl) errorEl.style.display = "block";
            return;
        }
        if (errorEl) errorEl.style.display = "none";

        addHabit(name, category, period, priority, startDate);
        renderHabits();
        renderDashboard();
        renderDailyTracker();

        // Reset form
        document.getElementById("habitName").value     = "";
        document.getElementById("habitCategory").value = "";
        document.getElementById("habitPeriod").value   = "Daily";
        const startEl = document.getElementById("habitStartDate");
        if (startEl) startEl.value = "";
        const highRadio = document.querySelector('input[name="priority"][value="High"]');
        if (highRadio) highRadio.checked = true;
    });
}