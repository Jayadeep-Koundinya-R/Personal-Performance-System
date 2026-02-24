/* ================= PRIORITY SETTINGS ================= */

function getPriorityColor(priority) {
    switch (priority) {
        case "High": return "#dc3545";
        case "Medium": return "#ffc107";
        case "Low": return "#28a745";
        default: return "#6c757d";
    }
}

const priorityOrder = {
    "High": 1,
    "Medium": 2,
    "Low": 3,
    "Optional": 4
};

/* ================= DUE DATE GENERATOR ================= */

function generateInitialDueDate(period) {
    const today = new Date();
    if (period === "Today") {
        return today.toISOString();
    }

    if (period === "Daily") {
        return today.toISOString();
    }

    if (period === "Weekly") {
        today.setDate(today.getDate() + 7);
        return today.toISOString();
    }

    if (period === "Monthly") {
        today.setMonth(today.getMonth() + 1);
        return today.toISOString();
    }

    return today.toISOString();
}

function updateNextDueDate(habit) {
    const currentDue = new Date(habit.dueDate);

    if (habit.period === "Daily") {
        currentDue.setDate(currentDue.getDate() + 1);
    }
    else if (habit.period === "Weekly") {
        currentDue.setDate(currentDue.getDate() + 7);
    }
    else if (habit.period === "Monthly") {
        currentDue.setMonth(currentDue.getMonth() + 1);
    }
    else {
        return; // "Today" or no period
    }

    habit.dueDate = currentDue.toISOString();
}

/* ================= CALCULATIONS ================= */

function calculateWeeklyPoints(habits) {
    let points = 0;

    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    habits.forEach(habit => {
        habit.completedDates.forEach(dateStr => {
            const completedDate = new Date(dateStr);
            if (completedDate >= weekAgo) {
                points += 10;
            }
        });
    });

    return points;
}

function calculateTotalXP(habits) {
    let total = 0;

    habits.forEach(habit => {
        total += habit.completedDates.length * 10;
    });

    return total;
}

function calculateLevel(habits) {
    const xp = calculateTotalXP(habits);
    return Math.floor(xp / 100) + 1;
}
