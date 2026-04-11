/**
 * dashboard.js
 * Dashboard, analytics, reminders, notifications, and settings UI rendering.
 */

import { getData, getStorageSize, saveData } from './storageService.js';
import { CONFIG, getAppSettings, saveAppSettings } from './config.js';
import { getState, updateState } from './state.js';
import { isHabitDueOn, updateHabitCompletion } from './habits.js';
import {
    calculateLevel,
    calculateTotalXP,
    calculateWeeklyPoints,
    getLocalDateKey,
    getToday,
    getTodayStr,
    isDateWithinRange,
    setBar,
    setEl
} from './utils.js';

import { formatReminderTime, getReminders, getUpcomingReminders } from './reminder.js';
import {
    clearNotificationAlerts,
    getNotificationAlerts,
    getUnreadAlertCount,
    markAlertRead,
    markAllAlertsRead
} from './notifications.js';

let notificationCenterBound = false;

function getAnalyticsFilterValue() {
    return document.getElementById('analyticsFilter')?.value || '7';
}

function getAnalyticsRangeDays() {
    const value = getAnalyticsFilterValue();
    if (value === 'all') return null;
    return Number(value);
}

function getAllCompletedDates(habits) {
    return habits.flatMap(habit => habit.completedDates || []).sort();
}

function getAnalyticsRange() {
    const { habits } = getState();
    const end = getToday();
    const days = getAnalyticsRangeDays();

    if (days) {
        const start = new Date(end);
        start.setDate(end.getDate() - days + 1);
        start.setHours(0, 0, 0, 0);
        return { start, end, days };
    }

    const allDates = getAllCompletedDates(habits);
    const start = allDates.length
        ? new Date(`${allDates[0]}T00:00:00`)
        : new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);

    start.setHours(0, 0, 0, 0);
    return {
        start,
        end,
        days: Math.max(1, Math.round((end - start) / 86400000) + 1)
    };
}

function getDateRangeArray(start, end) {

    const dates = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);

    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

function getCompletionMap(habits) {
    const map = {};
    habits.forEach(habit => {
        (habit.completedDates || []).forEach(dateStr => {
            map[dateStr] = (map[dateStr] || 0) + 1;
        });
    });
    return map;
}

function estimateHabitTargetInRange(habit, days) {
    if (habit.period === 'Daily') return days;
    if (habit.period === 'Weekly') return Math.max(1, Math.ceil(days / 7));
    if (habit.period === 'Monthly') return Math.max(1, Math.ceil(days / 30));
    return 1;
}

function getAnalyticsSnapshot() {
    const { habits } = getState();
    const { start, end, days } = getAnalyticsRange();

    let totalDone = 0;
    let totalTarget = 0;
    let bestStreak = 0;

    habits.forEach(habit => {
        const done = (habit.completedDates || []).filter(dateStr => isDateWithinRange(dateStr, start, end)).length;
        totalDone += done;
        totalTarget += estimateHabitTargetInRange(habit, days);
        bestStreak = Math.max(bestStreak, habit.streak || 0);
    });

    return {
        start,
        end,
        days,
        totalDone,
        avgCompletion: totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0,
        bestStreak,
        totalXP: totalDone * getAppSettings().xpPerCompletion
    };
}

function formatRelativeMinutes(minutes) {
    if (minutes <= 0) return 'now';
    if (minutes < 60) return `in ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!remainder) return `in ${hours} hr`;
    return `in ${hours} hr ${remainder} min`;
}

function buildTaskItem(habit, today, todayStr) {
    const dueDate = new Date(habit.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueDate - today) / 86400000);
    const isCompletedToday = habit.completedDates.includes(todayStr);

    let tagClass = 'tag-upcoming';
    let tagText = `Due ${dueDate.toLocaleDateString(undefined, { weekday: 'long' })}`;

    if (diffDays < 0) {
        tagClass = 'tag-overdue';
        tagText = 'Overdue';
    } else if (diffDays === 0) {
        tagClass = isCompletedToday ? 'tag-done' : 'tag-today';
        tagText = isCompletedToday ? 'Done ✓' : 'Due Today';
    } else if (diffDays === 1) {
        tagClass = 'tag-tomorrow';
        tagText = 'Due Tomorrow';
    }

    return `
        <div class="task-item">
            <div class="task-left">
                <input type="checkbox" data-task-checkbox data-id="${habit.id}" ${isCompletedToday ? 'checked' : ''}>
                <span class="${isCompletedToday ? 'task-done' : ''}">${habit.name}</span>
            </div>
            <span class="status-tag ${tagClass}">${tagText}</span>
        </div>
    `;
}

function bindTaskCheckboxes(root, habits) {
    root.querySelectorAll('[data-task-checkbox]').forEach(input => {
        input.addEventListener('change', event => {
            const id = Number(event.currentTarget.dataset.id);
            const habit = habits.find(item => item.id === id);
            if (!habit) return;
            updateHabitCompletion(habit, event.currentTarget.checked, event.currentTarget);
        });
    });
}

export function setupDashboardFilter() {
    const sel = document.getElementById('globalFilter');
    if (!sel || sel.dataset.bound === 'true') return;
    sel.dataset.bound = 'true';
    sel.addEventListener('change', () => {
        renderDashboard();
        renderDailyTracker();
        renderStreakSection();
        renderAnalyticsSection();
    });
}

export function setupAnalyticsFilter() {
    const sel = document.getElementById('analyticsFilter');
    if (!sel || sel.dataset.bound === 'true') return;
    sel.dataset.bound = 'true';
    sel.addEventListener('change', () => {
        renderAnalyticsSection();
    });
}

function getDashboardRange() {
    const filter = document.getElementById('globalFilter')?.value || 'today';
    const end = getToday();
    const start = new Date(end);

    if (filter === 'week') {
        const day = end.getDay();
        const diff = end.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        start.setDate(diff);
    } else if (filter === 'month') {
        start.setDate(1);
    }
    start.setHours(0, 0, 0, 0);
    return { start, end, isRange: filter !== 'today' };
}

export function renderDashboard() {
    const { habits } = getState();
    const criticalList = document.getElementById('criticalList');
    const highList = document.getElementById('highList');
    const mediumList = document.getElementById('mediumList');
    const upcomingList = document.getElementById('upcomingList');
    if (!criticalList || !highList || !mediumList || !upcomingList) return;

    const { start, end, isRange } = getDashboardRange();
    const todayStr = getTodayStr();
    
    const critical = [];
    const high = [];
    const medium = [];
    const upcoming = [];

    habits.forEach(habit => {
        const dueDate = new Date(habit.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dueDate - end) / 86400000);
        
        const isExactlyToday = isHabitDueOn(habit, todayStr);
        const isFuture = diffDays > 0;
        const isOverdue = diffDays < 0;
        
        const wasCompletedToday = habit.completedDates.includes(todayStr);
        const wasCompletedInRange = isRange && habit.completedDates.some(d => isDateWithinRange(d, start, end));

        if (isExactlyToday) {
            critical.push(habit);
        } else if (isFuture) {
            if (habit.priority === 'High') high.push(habit);
            else if (habit.priority === 'Medium') medium.push(habit);
            else upcoming.push(habit);
        } else if (isOverdue && wasCompletedToday) {
            upcoming.push(habit);
        } else if (wasCompletedInRange) {
            upcoming.push(habit);
        }
    });

    [
        { list: criticalList, items: critical, empty: 'No critical tasks.' },
        { list: highList, items: high, empty: 'No high-priority tasks.' },
        { list: mediumList, items: medium, empty: 'No medium-focus items.' },
        { list: upcomingList, items: upcoming, empty: 'No additional tasks.' }
    ].forEach(group => {
        if (group.items.length === 0) {
            group.list.innerHTML = `<div class="widget-empty">${group.empty}</div>`;
            return;
        }

        group.list.innerHTML = group.items.map(habit => buildTaskItem(habit, end, todayStr)).join('');
        bindTaskCheckboxes(group.list, habits);
    });

    setupNotificationCenter();
    renderDashboardReminderWidget();
    renderNotificationCenter();
    updateAllStats();
}


export function updateAllStats() {
    updateCompletionStats();
    updateProgressWidget();
    updateWeeklyChart();
    updateLevelWidget();
    updateAchievementWidget();
    updateSocialUI();
    updateDateDisplay();
    renderDashboardReminderWidget();
    renderNotificationCenter();
    updateDonutChart();
}
export function updateCompletionStats() {
    const { habits } = getState();
    const { start, end, isRange } = getDashboardRange();
    const todayStr = getTodayStr();

    let dueInRange = 0;
    let doneInRange = 0;
    let freezeCredits = 0;
    let maxStreak = 0;

    habits.forEach(habit => {
        const dueDate = new Date(habit.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dueDate - end) / 86400000);
        const isExactlyToday = isHabitDueOn(habit, todayStr);

        const completionsInRange = (habit.completedDates || []).filter(d => isDateWithinRange(d, start, end)).length;
        const doneToday = (habit.completedDates || []).includes(todayStr);

        if (isExactlyToday || (isRange && completionsInRange > 0)) {
            // Count anything that's due today, or if we're in range mode, anything we did or was due.
            dueInRange += 1; 
        }
        
        if (isRange) {
            if (completionsInRange > 0) doneInRange += completionsInRange;
        } else {
            if (doneToday) doneInRange += 1;
        }

        freezeCredits += habit.freezeCredits || 0;
        maxStreak = Math.max(maxStreak, habit.streak || 0);
    });

    const completionPct = dueInRange > 0 ? Math.round(( (isRange ? doneInRange : doneInRange) / dueInRange) * 100) : 0;
    // For ranges, we might want a different calculation, but for now let's keep it simple
    
    const totalXP = calculateTotalXP(habits);
    const level = calculateLevel(habits);
    const weeklyPoints = calculateWeeklyPoints(habits);
    const totalDoneAllTime = habits.reduce((sum, habit) => sum + (habit.completedDates || []).length, 0);
    const analytics = getAnalyticsSnapshot();

    setEl('completionRate', `${isRange ? Math.min(100, Math.round((doneInRange / (dueInRange || 1)) * 100)) : completionPct}%`);
    setEl('freezeCreditsDisplay', freezeCredits);
    setEl('currentStreak', `🔥 ${maxStreak}`);
    setEl('weeklyPoints', weeklyPoints);

    setEl('heroStreak', maxStreak);
    setEl('heroFreeze', freezeCredits);
    setEl('heroBest', maxStreak);
    setEl('heroTotal', totalDoneAllTime);

    setEl('avgCompletion', `${analytics.avgCompletion}%`);
    setEl('bestStreak', analytics.bestStreak);
    setEl('totalXP', analytics.totalXP);
    setEl('totalDone', analytics.totalDone);

    const currentStats = getState().stats;
    updateState({
        stats: {
            ...currentStats,
            totalXP,
            level,
            streak: maxStreak,
            freezeCredits
        }
    });
}


export function updateProgressWidget() {
    const { habits } = getState();
    const todayStr = getTodayStr();
    const { xpPerCompletion } = getAppSettings();

    let due = 0, done = 0;
    habits.forEach(habit => {
        if (!isHabitDueOn(habit, todayStr)) return;
        due++;
        if (habit.completedDates.includes(todayStr)) done++;
    });

    const pct = due > 0 ? Math.round((done / due) * 100) : 0;
    const xpEarned = done * xpPerCompletion;

    // Text elements
    setEl('todayProgress', `${done}/${due}`);
    setEl('trackerProgress', `${done}/${due}`);
    setBar('trackerProgressBar', pct);
    setEl('trackerPercent', `${pct}%`);

    // Tracker ring SVG
    const ring = document.getElementById('trackerRingFill');
    if (ring) {
        const circumference = 201.1;
        ring.style.strokeDashoffset = circumference - (pct / 100) * circumference;
    }

    // XP badge
    setEl('trackerXpBadge', `+${xpEarned} XP today`);

    // Motivation message
    const msgEl = document.getElementById('trackerMotivation');
    if (msgEl) {
        if (due === 0)       msgEl.textContent = 'No habits due today';
        else if (pct === 0)  msgEl.textContent = "Let's get started 💪";
        else if (pct < 50)   msgEl.textContent = 'Good start, keep going! 🚀';
        else if (pct < 100)  msgEl.textContent = 'Halfway there, push through! 🔥';
        else                 msgEl.textContent = 'Perfect day! Every habit done ⭐';
    }

    // Banner glow when complete
    const banner = document.querySelector('.tracker-hero-banner');
    if (banner) {
        banner.classList.toggle('tracker-hero-complete', pct === 100 && due > 0);
    }
}

function renderBarChart(containerId, bars) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const max = Math.max(...bars.map(bar => bar.value), 1);
    container.innerHTML = bars.map(bar => {
        const height = Math.max(6, Math.round((bar.value / max) * 100));
        const isEmpty = bar.value === 0;
        return `
            <div class="bar-col">
                <div class="bar-val-label" style="font-size:11px;color:${isEmpty ? 'var(--border-bright)' : 'var(--text-2)'};font-family:'DM Mono',monospace;margin-bottom:4px;text-align:center;">${bar.value > 0 ? bar.value : ''}</div>
                <div class="bar-track" style="flex:1;display:flex;align-items:flex-end;">
                    <div class="bar" style="height:${height}%;background:${isEmpty ? 'var(--border)' : bar.gradient};border-radius:6px 6px 0 0;width:100%;min-height:4px;transition:height .4s cubic-bezier(.4,0,.2,1);"></div>
                </div>
                <div class="bar-label">${bar.label}</div>
            </div>
        `;
    }).join('');
}

function updateDonutChart() {
    const { habits } = getState();
    const todayStr = getTodayStr();

    let due = 0, done = 0;
    const habitDetails = [];

    habits.forEach(habit => {
        if (!isHabitDueOn(habit, todayStr)) return;
        due++;
        const isDone = habit.completedDates.includes(todayStr);
        if (isDone) done++;
        habitDetails.push({ name: habit.name, done: isDone, priority: habit.priority });
    });

    const pct = due > 0 ? Math.round((done / due) * 100) : 0;
    const circumference = 339.3;
    const offset = circumference - (pct / 100) * circumference;

    const fill = document.getElementById('donutFill');
    const pctEl = document.getElementById('donutPct');
    const subEl = document.getElementById('donutSub');
    const legendEl = document.getElementById('donutLegend');

    if (fill) fill.style.strokeDashoffset = offset;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (subEl) subEl.textContent = `${done} / ${due}`;

    if (legendEl) {
        if (habitDetails.length === 0) {
            legendEl.innerHTML = `<div style="font-size:12px;color:var(--muted);text-align:center;">No habits due today</div>`;
        } else {
            legendEl.innerHTML = habitDetails.slice(0, 4).map(h => `
                <div style="display:flex;align-items:center;gap:8px;font-size:12px;">
                    <span style="width:8px;height:8px;border-radius:50%;background:${h.done ? 'var(--green)' : 'var(--border-bright)'};flex-shrink:0;"></span>
                    <span style="color:${h.done ? 'var(--text-2)' : 'var(--muted)'};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h.name}</span>
                    <span style="color:${h.done ? 'var(--green)' : 'var(--muted)'};">${h.done ? '✓' : '○'}</span>
                </div>
            `).join('') + (habitDetails.length > 4 ? `<div style="font-size:11px;color:var(--muted);text-align:center;">+${habitDetails.length - 4} more</div>` : '');
        }
    }
}

function getAnalyticsChartBars() {
    const { habits } = getState();
    const filter = getAnalyticsFilterValue();
    const today = getToday();
    const completionMap = getCompletionMap(habits);

    if (filter === '7') {
        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (6 - index));
            const dateStr = getLocalDateKey(date);
            return {
                label: date.toLocaleDateString(undefined, { weekday: 'short' }),
                value: completionMap[dateStr] || 0,
                gradient: 'linear-gradient(180deg, #38bdf8, #2563eb)'
            };
        });
    }

    if (filter === '30') {
        return Array.from({ length: 5 }, (_, index) => {
            const bucketEnd = new Date(today);
            bucketEnd.setDate(today.getDate() - ((4 - index) * 7));
            const bucketStart = new Date(bucketEnd);
            bucketStart.setDate(bucketEnd.getDate() - 6);

            let value = 0;
            getDateRangeArray(bucketStart, bucketEnd).forEach(date => {
                const dateStr = getLocalDateKey(date);
                value += completionMap[dateStr] || 0;
            });

            return {
                label: `W${index + 1}`,
                value,
                gradient: 'linear-gradient(180deg, #8b5cf6, #4338ca)'
            };
        });
    }

    const { start } = getAnalyticsRange();
    const bars = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 1);

    while (cursor <= end) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        let value = 0;

        Object.entries(completionMap).forEach(([dateStr, count]) => {
            const date = new Date(`${dateStr}T00:00:00`);
            if (date.getFullYear() === year && date.getMonth() === month) {
                value += count;
            }
        });

        bars.push({
            label: cursor.toLocaleDateString(undefined, { month: 'short' }),
            value,
            gradient: 'linear-gradient(180deg, #14b8a6, #0f766e)'
        });

        cursor.setMonth(cursor.getMonth() + 1);
    }

    return bars.slice(-8);
}

export function updateWeeklyChart() {
    const { habits } = getState();
    const completionMap = getCompletionMap(habits);
    const today = getToday();

    const dashboardBars = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        const dateStr = getLocalDateKey(date);
        const isToday = index === 6;
        return {
            label: isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' }),
            value: completionMap[dateStr] || 0,
            gradient: isToday
                ? 'linear-gradient(180deg, #2dd4bf, #0f766e)'
                : 'linear-gradient(180deg, #60a5fa, #1d4ed8)'
        };
    });

    renderBarChart('weeklyChart', dashboardBars);

    // Analytics chart with label update
    const analyticsBars = getAnalyticsChartBars();
    renderBarChart('analyticsWeekChart', analyticsBars);

    const filter = getAnalyticsFilterValue();
    const labelEl = document.getElementById('analyticsChartLabel');
    if (labelEl) {
        labelEl.textContent = filter === '7' ? 'Last 7 Days' : filter === '30' ? 'Last 30 Days' : 'All Time';
    }
}
export function renderHeatmap() {
    const grid = document.getElementById('heatmapGrid');
    const months = document.getElementById('heatmapMonths');
    const total = document.getElementById('heatmapTotal');
    if (!grid || !months || !total) return;

    const rangeDays = Number(document.getElementById('heatmapRange')?.value || 182);
    const today = getToday();
    const { habits } = getState();
    const completionMap = getCompletionMap(habits);

    const start = new Date(today);
    start.setDate(today.getDate() - rangeDays + 1);
    start.setHours(0, 0, 0, 0);

    const startDay = start.getDay();
    const alignedStart = new Date(start);
    alignedStart.setDate(start.getDate() - (startDay === 0 ? 6 : startDay - 1));

    const dates = [];
    const cursor = new Date(alignedStart);
    while (cursor <= today) {
        dates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }

    const weeks = [];
    for (let index = 0; index < dates.length; index += 7) {
        weeks.push(dates.slice(index, index + 7));
    }

    const countsInRange = Object.entries(completionMap)
        .filter(([dateStr]) => isDateWithinRange(dateStr, start, today))
        .map(([, count]) => count);
    const maxCount = Math.max(...countsInRange, 1);

    // ── Dynamic cell sizing ──────────────────────────────────────────────────
    // Measure the actual rendered container width so cells fill the full box.
    // If the section is hidden (clientWidth = 0), defer to next animation frame.
    const scrollWrap = grid.closest('.heatmap-scroll-wrap') || grid.parentElement;
    const containerW = scrollWrap ? scrollWrap.clientWidth : 0;

    if (containerW <= 0) {
        // Section not visible yet — retry after paint
        requestAnimationFrame(() => renderHeatmap());
        return;
    }

    const numWeeks = weeks.length;
    const GAP = 3;
    // Subtract a small buffer (card padding + border) so the last column never clips
    const usableW = containerW - 4;
    // Largest integer cell that fits all weeks + gaps inside usableW
    const rawCell = Math.floor((usableW - (numWeeks - 1) * GAP) / numWeeks);
    const CELL = Math.min(22, Math.max(10, rawCell));
    const COL_W = CELL + GAP;
    const labelFontSize = CELL <= 12 ? 9 : CELL <= 16 ? 10 : 11;

    // ── Month labels ─────────────────────────────────────────────────────────
    const monthEntries = [];
    weeks.forEach((week, index) => {
        const firstVisible = week.find(date => date >= start && date <= today);
        if (!firstVisible) return;
        const label = firstVisible.toLocaleDateString(undefined, { month: 'short' });
        const monthKey = `${firstVisible.getFullYear()}-${firstVisible.getMonth()}`;
        if (!monthEntries.some(entry => entry.key === monthKey)) {
            monthEntries.push({ key: monthKey, label, index });
        }
    });

    months.className = 'heatmap-months';
    months.style.display = 'block';
    months.style.width = '100%';
    months.style.position = 'relative';
    months.style.height = `${labelFontSize + 6}px`;

    // Position each label absolutely at the exact pixel offset of its week column
    months.innerHTML = monthEntries.map((entry, i) => {
        const leftPx = entry.index * COL_W;
        const nextIndex = monthEntries[i + 1]?.index ?? weeks.length;
        const spanCols = nextIndex - entry.index;
        // Max width = span in pixels, but at least 28px so short months still show
        const maxW = Math.max(28, spanCols * COL_W - 2);
        return `<span style="position:absolute;left:${leftPx}px;max-width:${maxW}px;overflow:hidden;white-space:nowrap;font-size:${labelFontSize}px;color:var(--muted);font-family:'DM Mono',monospace;">${entry.label}</span>`;
    }).join('');

    // ── Grid cells ───────────────────────────────────────────────────────────
    grid.className = 'heatmap-grid';
    grid.style.gap = `${GAP}px`;
    grid.style.width = '100%';

    grid.innerHTML = weeks.map(week => `
        <div class="heatmap-week" style="gap:${GAP}px;width:${CELL}px;flex-shrink:0;">
            ${week.map(date => {
                const dateStr = getLocalDateKey(date);
                if (date < start || date > today) {
                    return `<div class="heatmap-cell heatmap-cell-empty" style="width:${CELL}px;height:${CELL}px;"></div>`;
                }

                const count = completionMap[dateStr] || 0;
                const ratio = count / maxCount;
                let level = 0;
                if (count > 0) {
                    if (ratio <= 0.25) level = 1;
                    else if (ratio <= 0.5) level = 2;
                    else if (ratio <= 0.75) level = 3;
                    else level = 4;
                }

                const todayClass = dateStr === getLocalDateKey(today) ? ' heatmap-cell-today' : '';
                const title = count > 0
                    ? `${dateStr} • ${count} completion${count === 1 ? '' : 's'}`
                    : `${dateStr} • No completions`;

                return `<div class="heatmap-cell level-${level}${todayClass}" style="width:${CELL}px;height:${CELL}px;" title="${title}" role="gridcell" tabindex="0" aria-label="${title}"></div>`;
            }).join('')}
        </div>
    `).join('');

    const totalInRange = countsInRange.reduce((sum, count) => sum + count, 0);
    total.textContent = `${totalInRange} completions in range`;
}

export function renderDailyTracker() {
    const { habits } = getState();
    const list = document.getElementById('trackerList');
    if (!list) return;

    const todayStr = getTodayStr();
    const { xpPerCompletion } = getAppSettings();
    const todayHabits = habits.filter(habit => isHabitDueOn(habit, todayStr));

    if (todayHabits.length === 0) {
        list.innerHTML = '<p class="empty-text">No habits due today. Add habits in Habit Manager.</p>';
        updateProgressWidget();
        return;
    }

    const grouped = {};
    todayHabits.forEach(habit => {
        const category = habit.category || 'Uncategorized';
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(habit);
    });

    list.innerHTML = Object.entries(grouped).map(([category, categoryHabits]) => `
        <div class="card tracker-group-card">
            <h3>${category}</h3>
            ${categoryHabits.map(habit => {
                const done = habit.completedDates.includes(todayStr);
                const priorityClass = {
                    High: 'pri-high',
                    Medium: 'pri-medium',
                    Low: 'pri-low',
                    Optional: 'pri-optional'
                }[habit.priority] || 'pri-optional';

                return `
                    <div class="task-item">
                        <div class="task-left">
                            <input type="checkbox" data-tracker-checkbox data-id="${habit.id}" ${done ? 'checked' : ''}>
                            <span class="${done ? 'task-done' : ''}">${habit.name}</span>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <span class="status-tag ${priorityClass}">${habit.priority}</span>
                            <span class="status-tag ${done ? 'tag-done' : 'tag-today'}">${done ? `+${xpPerCompletion} XP ✓` : `+${xpPerCompletion} XP`}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `).join('');

    list.querySelectorAll('[data-tracker-checkbox]').forEach(input => {
        input.addEventListener('change', event => {
            const el = event.currentTarget;
            const id = Number(el.dataset.id);
            const habit = habits.find(item => item.id === id);
            if (!habit) return;

            const isChecked = el.checked;
            updateHabitCompletion(habit, isChecked, el);

            if (isChecked) {
                const row = el.closest('.task-item');
                if (row) {
                    row.classList.add('just-completed');
                    setTimeout(() => row.classList.remove('just-completed'), 600);
                }
            }
        });
    });

    updateProgressWidget();
}

export function renderStreakSection() {
    const { habits } = getState();
    const container = document.getElementById('habitStreakList');
    if (!container) return;

    if (habits.length === 0) {
        container.innerHTML = '<p class="empty-text">No habits yet. Add habits in Habit Manager.</p>';
        return;
    }

    container.innerHTML = habits.map(habit => {
        const streak = habit.streak || 0;
        const pct = Math.min(streak * 10, 100);

        // Intensity tiers
        let tier, icon, tierLabel;
        if (streak === 0)      { tier = 'dead';   icon = '○';  tierLabel = 'Not started'; }
        else if (streak < 3)   { tier = 'spark';  icon = '🌱'; tierLabel = 'Just started'; }
        else if (streak < 7)   { tier = 'warm';   icon = '🔥'; tierLabel = 'Building up'; }
        else if (streak < 14)  { tier = 'hot';    icon = '🔥'; tierLabel = 'On fire!'; }
        else if (streak < 30)  { tier = 'blazing';icon = '⚡'; tierLabel = 'Blazing!'; }
        else                   { tier = 'legend'; icon = '👑'; tierLabel = 'Legendary'; }

        return `
            <article class="streak-card-v2 streak-tier-${tier}">
                <div class="streak-card-v2-top">
                    <div class="streak-card-v2-icon">${icon}</div>
                    <div class="streak-card-v2-info">
                        <div class="streak-card-v2-name">${habit.name}</div>
                        <div class="streak-card-v2-meta">${habit.category || 'General'} · ${habit.period}</div>
                    </div>
                    <div class="streak-card-v2-num">${streak}</div>
                </div>
                <div class="streak-card-v2-tier-label">${tierLabel}</div>
                <div class="streak-card-v2-bar-track">
                    <div class="streak-card-v2-bar-fill" style="width:${pct}%;"></div>
                </div>
                <div class="streak-card-v2-footer">
                    <span>🧊 ${habit.freezeCredits || 0} freeze left</span>
                    <span>${streak} day${streak !== 1 ? 's' : ''}</span>
                </div>
            </article>
        `;
    }).join('');
}

export function renderHabitSuccessRates() {
    const { habits } = getState();
    const container = document.getElementById('habitSuccessRates');
    if (!container) return;

    if (habits.length === 0) {
        container.innerHTML = '<p class="empty-text">No habits yet.</p>';
        return;
    }

    const { start, end, days } = getAnalyticsRange();
    container.innerHTML = habits.map(habit => {
        const done = (habit.completedDates || []).filter(dateStr => isDateWithinRange(dateStr, start, end)).length;
        const target = estimateHabitTargetInRange(habit, days);
        const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
        const tone = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

        return `
            <div class="success-rate-row">
                <div class="success-rate-meta">
                    <span>${habit.name}</span>
                    <span style="color:${tone};">${pct}%</span>
                </div>
                <div class="prog-wrap">
                    <div class="prog-fill" style="width:${pct}%; background:linear-gradient(90deg, ${tone}, color-mix(in srgb, ${tone} 62%, white));"></div>
                </div>
            </div>
        `;
    }).join('');
}
function renderDashboardReminderWidget() {
    const countEl = document.getElementById('dashboardReminderCount');
    const headlineEl = document.getElementById('dashboardReminderHeadline');
    const listEl = document.getElementById('dashboardReminderList');
    if (!countEl || !headlineEl || !listEl) return;

    const reminders = getReminders();
    const enabled = reminders.filter(reminder => reminder.enabled !== false);
    const upcoming = getUpcomingReminders(3);

    countEl.textContent = `${enabled.length} enabled`;

    if (enabled.length === 0) {
        headlineEl.textContent = 'No active reminders yet';
        listEl.innerHTML = '<div class="widget-empty">Add a reminder to surface it here and in the alert bell.</div>';
        return;
    }

    const nextReminder = upcoming[0];
    headlineEl.textContent = nextReminder
        ? `${nextReminder.label} ${formatRelativeMinutes(nextReminder.nextInMinutes)}`
        : 'No reminder is scheduled next.';

    listEl.innerHTML = upcoming.map(reminder => `
        <div class="dashboard-reminder-item">
            <div>
                <div class="dashboard-reminder-label">${reminder.label}</div>
                <div class="dashboard-reminder-meta">${reminder.repeat}</div>
            </div>
            <div class="dashboard-reminder-time-wrap">
                <strong>${formatReminderTime(reminder.time)}</strong>
                <span>${formatRelativeMinutes(reminder.nextInMinutes)}</span>
            </div>
        </div>
    `).join('');
}

function setNotificationPanelState(open) {
    const bell = document.getElementById('notificationBell');
    const panel = document.getElementById('notificationPanel');
    if (!bell || !panel) return;

    bell.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.classList.toggle('open', open);
}

function setupNotificationCenter() {
    if (notificationCenterBound) return;

    const bell = document.getElementById('notificationBell');
    const panel = document.getElementById('notificationPanel');
    const list = document.getElementById('notificationList');
    const markReadBtn = document.getElementById('markAlertsReadBtn');
    const clearBtn = document.getElementById('clearAlertsBtn');
    if (!bell || !panel || !list || !markReadBtn || !clearBtn) return;

    notificationCenterBound = true;

    bell.addEventListener('click', event => {
        event.stopPropagation();
        setNotificationPanelState(!panel.classList.contains('open'));
    });

    panel.addEventListener('click', event => {
        event.stopPropagation();
    });

    list.addEventListener('click', event => {
        const button = event.target.closest('[data-alert-id]');
        if (!button) return;
        markAlertRead(button.dataset.alertId);
        renderNotificationCenter();
    });

    markReadBtn.addEventListener('click', () => {
        markAllAlertsRead();
        renderNotificationCenter();
    });

    clearBtn.addEventListener('click', () => {
        clearNotificationAlerts();
        renderNotificationCenter();
    });

    document.addEventListener('click', event => {
        const center = document.querySelector('.notification-center');
        if (!center?.contains(event.target)) setNotificationPanelState(false);
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') setNotificationPanelState(false);
    });
}

function renderNotificationCenter() {
    const badge = document.getElementById('notificationCountBadge');
    const list = document.getElementById('notificationList');
    const unreadText = document.getElementById('notificationUnreadLabel');
    if (!badge || !list || !unreadText) return;

    const alerts = getNotificationAlerts();
    const unread = getUnreadAlertCount();
    const bell = document.getElementById('notificationBell');

    if (bell) {
        if (unread > 0) bell.classList.add('has-unread');
        else bell.classList.remove('has-unread');
    }

    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.hidden = unread === 0;

    unreadText.textContent = unread === 0 ? 'All caught up' : `${unread} unread`;

    if (alerts.length === 0) {
        list.innerHTML = '<div class="notification-empty">Reminder alerts will appear here when their scheduled time is reached.</div>';
        return;
    }

    list.innerHTML = alerts.map(alert => `
        <article class="notification-item ${alert.read ? 'is-read' : ''}">
            <div class="notification-item-head">
                <div>
                    <strong>${alert.label}</strong>
                    <span>${formatReminderTime(alert.time)} • ${alert.repeat}</span>
                </div>
                ${alert.read ? '<span class="notification-read-state">Read</span>' : '<span class="notification-dot"></span>'}
            </div>
            <div class="notification-item-foot">
                <span>${new Date(alert.firedAt).toLocaleString()}</span>
                ${alert.read ? '' : `<button class="ghost-btn notification-read-btn" type="button" data-alert-id="${alert.id}">Mark read</button>`}
            </div>
        </article>
    `).join('');
}

function renderAnalyticsSection() {
    updateCompletionStats();
    renderHabitSuccessRates();
    updateWeeklyChart();
    renderHeatmap();
}

export function updateLevelWidget() {
    const { habits } = getState();
    const xp = calculateTotalXP(habits);
    const level = calculateLevel(habits);
    const xpThreshold = getAppSettings().levelXpThreshold;
    const xpInLevel = xp % xpThreshold;

    setEl('userLevel', `Lv. ${level}`);
    setEl('xpDisplay', `${xpInLevel} / ${xpThreshold} XP`);
    setBar('xpBar', (xpInLevel / xpThreshold) * 100, 'linear-gradient(90deg, #f59e0b, #f97316)');
    setEl('xpToNext', `${xpThreshold - xpInLevel} XP to Level ${level + 1}`);
    setEl('userLevelDisplay', `Level ${level} • ${xp} XP`);
}

export function updateAchievementWidget() {
    import('./achievements.js').then(module => {
        const stats = module.calculateAchievementStats();
        const totalBadges = 13;
        let unlockedCount = 0;

        const BADGE_IDS = [
            'first_step', 'on_a_roll', 'week_warrior', 'monthly_master',
            'getting_started', 'half_century', 'centurion', 'legendary',
            'perfect_day', 'habit_builder', 'streak_master', 'xp_hunter', 'dedication'
        ];

        const BADGE_META = {
            'first_step':      { n: 'First Step',      i: '🌱' },
            'on_a_roll':       { n: 'On a Roll',        i: '🔥' },
            'week_warrior':    { n: 'Week Warrior',     i: '⚔️' },
            'monthly_master':  { n: 'Monthly Master',   i: '🏆' },
            'getting_started': { n: 'Getting Started',  i: '✅' },
            'half_century':    { n: 'Half Century',     i: '🎯' },
            'centurion':       { n: 'Centurion',        i: '💯' },
            'legendary':       { n: 'Legendary',        i: '👑' },
            'perfect_day':     { n: 'Perfect Day',      i: '⭐' },
            'habit_builder':   { n: 'Habit Builder',    i: '📋' },
            'streak_master':   { n: 'Streak Master',    i: '❄️' },
            'xp_hunter':       { n: 'XP Hunter',        i: '⬆️' },
            'dedication':      { n: 'Dedication',       i: '📅' }
        };

        let lastBadgeId = null;
        BADGE_IDS.forEach(id => {
            if (module.isBadgeUnlocked({ id }, stats)) {
                unlockedCount++;
                lastBadgeId = id;
            }
        });

        const percent = Math.round((unlockedCount / totalBadges) * 100);
        setEl('dashAchievementCount', `${unlockedCount} / ${totalBadges}`);
        setEl('dashAchievementPercent', `${percent}%`);
        setBar('dashAchievementBar', percent);

        if (lastBadgeId && BADGE_META[lastBadgeId]) {
            const meta = BADGE_META[lastBadgeId];
            const iconEl = document.getElementById('dashLatestBadgeIcon');
            if (iconEl) {
                iconEl.textContent = meta.i;
                iconEl.style.filter = 'none';
                iconEl.style.opacity = '1';
            }
            setEl('dashLatestBadgeText', `Latest: ${meta.n}`);
        }
    });
}

export function updateSocialUI() {
    const { habits } = getState();
    const xp = calculateTotalXP(habits);
    const level = calculateLevel(habits);
    
    setEl('socialUserLevel', `Level ${level}`);
    setEl('socialUserXP', `${xp.toLocaleString()} XP`);
}

export function updateDateDisplay() {
    const today = getToday();
    const { habits } = getState();
    const dateText = today.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const todayStr = getTodayStr();
    const activeCount = habits.filter(habit => isHabitDueOn(habit, todayStr)).length;
    const chip = `<span class="habits-active-chip">${activeCount} habit${activeCount === 1 ? '' : 's'} active</span>`;

    const dashboardDate = document.getElementById('dashboardDate');
    if (dashboardDate) dashboardDate.innerHTML = `${dateText}${chip}`;

    const trackerDate = document.getElementById('trackerDate');
    if (trackerDate) trackerDate.textContent = dateText;
}

export function setupSettings(user) {
    setEl('settingsEmail', user.email || 'Apex Performer');
    const appSettings = getAppSettings();

    let storedName = getData(`pps_name_${user.email || 'guest'}`, '');
    if (user.email && (storedName === user.email || storedName === user.email.split('@')[0])) {
        storedName = '';
    }
    const displayName = storedName || user.name || 'Apex Performer';

    const avatarEl = document.getElementById('userAvatar');
    if (avatarEl) avatarEl.textContent = displayName[0].toUpperCase();
    setEl('userNameDisplay', displayName);

    const nameInput = document.getElementById('settingsName');
    if (nameInput) nameInput.value = displayName;

    const xpInput = document.getElementById('xpPerHabit');
    const freezeInput = document.getElementById('defaultFreeze');
    if (xpInput) xpInput.value = appSettings.xpPerCompletion;
    if (freezeInput) freezeInput.value = appSettings.maxFreezeCredits;
    setEl('settingsXpPreview', `${appSettings.xpPerCompletion} XP`);
    setEl('settingsFreezePreview', `${appSettings.maxFreezeCredits} credits`);

    document.getElementById('saveNameBtn')?.addEventListener('click', () => {
        const newName = document.getElementById('settingsName')?.value.trim();
        if (!newName) {
            showSettingsMessage('Name cannot be empty.');
            return;
        }

        saveData(`pps_name_${user.email || 'guest'}`, newName);
        if (user.email) {
            saveData('currentUser', { ...user, name: newName });
            const users = getData('pps_users', []);
            const idx = users.findIndex(item => item.email === user.email);
            if (idx !== -1) {
                users[idx] = { ...users[idx], name: newName };
                saveData('pps_users', users);
            }
        }
        setEl('userNameDisplay', newName);
        if (avatarEl) avatarEl.textContent = newName[0].toUpperCase();
        const greetingEl = document.getElementById('greetingDisplay');
        if (greetingEl) {
            const hour = new Date().getHours();
            const greet = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
            greetingEl.innerHTML = `${greet}, <span style="color:var(--accent);">${newName}</span>! 👋`;
        }
        showSettingsMessage('Name saved.', 'success');
    });

    document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
        const current = document.getElementById('currentPassword')?.value;
        const next = document.getElementById('newPassword')?.value;
        const confirm = document.getElementById('confirmPassword')?.value;

        if (!current || !next || !confirm) {
            showSettingsMessage('Fill in all password fields.');
            return;
        }
        if (next.length < 6) {
            showSettingsMessage('New password must be at least 6 characters.');
            return;
        }
        if (next !== confirm) {
            showSettingsMessage('Passwords do not match.');
            return;
        }

        const { hashPassword } = await import('./auth.js');
        const users = getData('pps_users', []);
        const hashedCurrent = await hashPassword(current);
        const hashedNext = await hashPassword(next);
        const idx = users.findIndex(item => item.email === user.email && item.password === hashedCurrent);

        if (idx === -1) {
            showSettingsMessage('Current password is incorrect.');
            return;
        }

        users[idx].password = hashedNext;
        saveData('pps_users', users);
        ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
            const field = document.getElementById(id);
            if (field) field.value = '';
        });
        showSettingsMessage('Password updated.', 'success');
    });

    document.getElementById('savePreferencesBtn')?.addEventListener('click', () => {
        const nextXp = Number(document.getElementById('xpPerHabit')?.value);
        const nextFreeze = Number(document.getElementById('defaultFreeze')?.value);

        if (!Number.isFinite(nextXp) || nextXp < 1) {
            showSettingsMessage('XP per habit must be at least 1.');
            return;
        }
        if (!Number.isFinite(nextFreeze) || nextFreeze < 0) {
            showSettingsMessage('Freeze credits cannot be negative.');
            return;
        }

        const savedSettings = saveAppSettings({
            xpPerCompletion: nextXp,
            maxFreezeCredits: nextFreeze
        });

        if (xpInput) xpInput.value = savedSettings.xpPerCompletion;
        if (freezeInput) freezeInput.value = savedSettings.maxFreezeCredits;
        setEl('settingsXpPreview', `${savedSettings.xpPerCompletion} XP`);
        setEl('settingsFreezePreview', `${savedSettings.maxFreezeCredits} credits`);

        document.dispatchEvent(new CustomEvent('habitsUpdated'));
        showSettingsMessage('Preferences saved.', 'success');
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        const { removeData } = await import('./storageService.js');
        removeData('currentUser');
        window.location.href = 'login.html';
    });

    document.getElementById('resetBtn')?.addEventListener('click', () => {
        if (!confirm('Reset all habit data? This cannot be undone.')) return;
        const { storageKey } = getState();
        updateState({ habits: [] });
        saveData(storageKey, []);
        document.dispatchEvent(new CustomEvent('habitsUpdated'));
        showSettingsMessage('All data reset.', 'success');
    });

    // ── JSON Export ──
    document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
        const { habits, storageKey, stats, statsKey } = getState();
        const backup = {
            version: 1,
            exportedAt: new Date().toISOString(),
            storageKey,
            habits,
            stats
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pps_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showSettingsMessage('Backup downloaded.', 'success');
    });

    // ── JSON Import ──
    document.getElementById('importJsonInput')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const backup = JSON.parse(text);
            if (!backup.habits || !Array.isArray(backup.habits)) {
                showSettingsMessage('Invalid backup file.');
                return;
            }
            if (!confirm(`Import ${backup.habits.length} habits from backup? This will overwrite your current habits.`)) {
                e.target.value = '';
                return;
            }
            const { storageKey, statsKey } = getState();
            updateState({ habits: backup.habits, stats: backup.stats || getState().stats });
            saveData(storageKey, backup.habits);
            if (backup.stats && statsKey) saveData(statsKey, backup.stats);
            document.dispatchEvent(new CustomEvent('habitsUpdated'));
            showSettingsMessage(`Imported ${backup.habits.length} habits.`, 'success');
        } catch {
            showSettingsMessage('Could not read backup file.');
        }
        e.target.value = '';
    });

    setEl('storageUsed', `~${(getStorageSize() / 1024).toFixed(1)} KB`);
}

function showSettingsMessage(text, type = 'error') {
    const el = document.getElementById('settingsMsg');
    if (!el) return;
    el.textContent = text;
    el.className = `msg ${type}`;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 3000);
}
