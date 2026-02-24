/* ================= MAIN INITIALIZATION ================= */

document.addEventListener("DOMContentLoaded", () => {

    // 1. Auth check
    const user = checkAuth();
    if (!user) return;

    // 2. Load habits from storage
    initHabits(user);

    // 3. Navigation
    setupNavigation();

    // 4. Habit Manager button
    setupAddHabitButton();

    // 5. Settings wiring (logout, export, reset, email display)
    setupSettings(user);

    // 6. Initial renders
    renderHabits();
    renderDashboard();
    renderDailyTracker();
    renderStreakSection();
    renderHabitSuccessRates();

    // 7. Reflections setup
    setupReflections(user);

    // 8. Reminders setup
    setupReminders(user);
});