/* ================= HABIT STORAGE & MANAGEMENT ================= */

let habits    = [];
let storageKey = "";

/* ─────────────────────────────────────
   INIT & SAVE
───────────────────────────────────── */
function initHabits(user) {
    storageKey = `habits_${user.email || "guest"}`;
    habits     = JSON.parse(localStorage.getItem(storageKey)) || [];
    return habits;
}

function saveHabits() {
    localStorage.setItem(storageKey, JSON.stringify(habits));
}

/* ─────────────────────────────────────
   ADD
───────────────────────────────────── */
function addHabit(name, category, period, priority) {
    const newHabit = {
        id:                Date.now(),
        name:              name,
        category:          category || "Uncategorized",
        priority:          priority,
        period:            period,
        dueDate:           generateInitialDueDate(period),
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
   COMPLETION + STREAK LOGIC
───────────────────────────────────── */
function updateHabitCompletion(habit, isCompleted) {
    const todayStr = new Date().toISOString().split("T")[0];

    if (isCompleted) {
        // Add today if not already there
        if (!habit.completedDates.includes(todayStr)) {
            habit.completedDates.push(todayStr);
        }

        // ── STREAK LOGIC ──
        if (habit.lastCompletedDate) {
            const diffDays = Math.round(
                (new Date(todayStr) - new Date(habit.lastCompletedDate))
                / (1000 * 60 * 60 * 24)
            );

            if (diffDays === 1) {
                // consecutive day — extend streak
                habit.streak += 1;
            } else if (diffDays === 0) {
                // same day, already counted — do nothing
            } else {
                // gap > 1 day
                if (habit.freezeCredits > 0) {
                    habit.freezeCredits -= 1; // burn a freeze, keep streak
                } else {
                    habit.streak = 1;         // reset
                }
            }
        } else {
            habit.streak = 1; // very first completion
        }

        habit.lastCompletedDate = todayStr;

        // Auto-advance due date for recurring habits
        updateNextDueDate(habit);

    } else {
        // ── UNCHECK LOGIC ──
        habit.completedDates = habit.completedDates.filter(d => d !== todayStr);

        if (habit.completedDates.length > 0) {
            habit.completedDates.sort();
            habit.lastCompletedDate =
                habit.completedDates[habit.completedDates.length - 1];
        } else {
            habit.lastCompletedDate = null;
            habit.streak            = 0;
        }
    }

    saveHabits();
}

/* ─────────────────────────────────────
   RENDER HABIT LIST (Habit Manager)
───────────────────────────────────── */
function renderHabits() {
    const habitList  = document.getElementById("habitList");
    const habitCount = document.getElementById("habitCount");

    if (!habitList) return;

    // update count badge
    if (habitCount) habitCount.textContent = habits.length;

    if (habits.length === 0) {
        habitList.innerHTML = `<p class="empty-text">No habits yet — add one above.</p>`;
        return;
    }

    habitList.innerHTML = "";

    habits.forEach(habit => {
        const card = document.createElement("div");
        card.className = "habit-card";

        // pick badge class
        const priClass = {
            "High":     "pri-high",
            "Medium":   "pri-medium",
            "Low":      "pri-low",
            "Optional": "pri-optional"
        }[habit.priority] || "pri-optional";

        card.innerHTML = `
            <div class="habit-info">
                <h4>${habit.name}</h4>
                <div class="habit-meta">
                    ${habit.category} &nbsp;•&nbsp; ${habit.period}
                    &nbsp;•&nbsp; 🔥 ${habit.streak} day streak
                </div>
            </div>
            <div class="habit-actions">
                <span class="pri-badge ${priClass}">${habit.priority}</span>
                <button class="ghost-btn edit-btn" data-id="${habit.id}">Edit</button>
                <button class="danger-btn delete-btn" data-id="${habit.id}">Delete</button>
            </div>
        `;

        // Delete
        card.querySelector(".delete-btn").addEventListener("click", () => {
            if (confirm(`Delete "${habit.name}"?`)) {
                deleteHabit(habit.id);
                renderHabits();
                renderDashboard();
            }
        });

        // Edit (inline name change for now)
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

    // update weekly points everywhere
    const points = calculateWeeklyPoints(habits);
    document.querySelectorAll("#weeklyPoints").forEach(el => {
        el.textContent = points;
    });
}

/* ─────────────────────────────────────
   SETUP ADD HABIT BUTTON
───────────────────────────────────── */
function setupAddHabitButton() {
    const addHabitBtn = document.getElementById("addHabitBtn");
    if (!addHabitBtn) return;

    addHabitBtn.addEventListener("click", () => {
        const name     = document.getElementById("habitName")?.value.trim();
        const category = document.getElementById("habitCategory")?.value.trim();
        const period   = document.getElementById("habitPeriod")?.value || "Daily";
        const priority = document.querySelector('input[name="priority"]:checked')?.value || "Optional";

        // Validation
        const errorEl = document.getElementById("habitError");
        if (!name) {
            if (errorEl) errorEl.style.display = "block";
            return;
        }
        if (errorEl) errorEl.style.display = "none";

        addHabit(name, category, period, priority);
        renderHabits();
        renderDashboard();

        // Reset form
        document.getElementById("habitName").value     = "";
        document.getElementById("habitCategory").value = "";
        document.getElementById("habitPeriod").value   = "Daily";
        // reset priority to High
        const highRadio = document.querySelector('input[name="priority"][value="High"]');
        if (highRadio) highRadio.checked = true;
    });
}