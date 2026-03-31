/**
 * PPS — Achievements Module
 * Manages badge definitions, progress tracking, and rendering
 */

import { getState } from './state.js';
import { getData } from './storageService.js';

const BADGES = [
    { id: 'first_step',      name: 'First Step',      desc: 'Complete your first habit.', icon: '🌱', req: '1 completion',   target: 1 },
    { id: 'on_a_roll',       name: 'On a Roll',       desc: 'Achieve a 3-day streak.',   icon: '🔥', req: '3-day streak',   target: 3 },
    { id: 'week_warrior',    name: 'Week Warrior',    desc: 'Achieve a 7-day streak.',   icon: '⚔️', req: '7-day streak',   target: 7 },
    { id: 'monthly_master',  name: 'Monthly Master',  desc: 'Achieve a 30-day streak.',  icon: '🏆', req: '30-day streak',  target: 30 },
    { id: 'getting_started', name: 'Getting Started', desc: 'Reach 10 completions.',     icon: '✅', req: '10 completions',  target: 10 },
    { id: 'half_century',    name: 'Half Century',    desc: 'Reach 50 completions.',     icon: '🎯', req: '50 completions',  target: 50 },
    { id: 'centurion',       name: 'Centurion',       desc: 'Reach 100 completions.',    icon: '💯', req: '100 completions', target: 100 },
    { id: 'legendary',       name: 'Legendary',       desc: 'Reach 500 completions.',    icon: '👑', req: '500 completions', target: 500 },
    { id: 'perfect_day',     name: 'Perfect Day',     desc: 'All habits done in a day.', icon: '⭐', req: '100% completion',  target: 100 },
    { id: 'habit_builder',   name: 'Habit Builder',   desc: 'Have 5 habits active.',      icon: '📋', req: '5 habits tracked', target: 5 },
    { id: 'streak_master',   name: 'Streak Master',   desc: 'Use a freeze credit.',      icon: '❄️', req: '1 credit used',    target: 1 },
    { id: 'xp_hunter',       name: 'XP Hunter',       desc: 'Reach level 5.',            icon: '⬆️', req: 'Level 5 reached',   target: 5 },
    { id: 'dedication',      name: 'Dedication',      desc: 'Log in 7 days in a row.',   icon: '📅', req: '7-day login',     target: 7 }
];

export function renderAchievements() {
    const grid = document.getElementById('badgeGrid');
    if (!grid) return;

    const stats = calculateAchievementStats();
    const unlockedCount = checkAllBadges(stats);
    
    // Update summary UI
    document.getElementById('achievementsSummary').textContent = `${unlockedCount}/${BADGES.length} badges unlocked`;
    const percent = Math.round((unlockedCount / BADGES.length) * 100);
    document.getElementById('achievementsPercent').textContent = `${percent}%`;
    document.getElementById('achievementsBar').style.width = `${percent}%`;
    
    // Update stats UI
    document.getElementById('achTotalCompletions').textContent = stats.totalCompletions;
    document.getElementById('achBestStreak').textContent = stats.bestStreak;
    document.getElementById('achTotalHabits').textContent = stats.totalHabits;
    document.getElementById('achUserLevel').textContent = stats.level;

    // Render grid
    grid.innerHTML = BADGES.map(badge => {
        const isUnlocked = isBadgeUnlocked(badge, stats);
        return `
            <div class="card badge-card ${isUnlocked ? 'unlocked' : 'locked'}" 
                 style="display:flex; align-items:center; gap:16px; padding:16px; transition:all 0.3s; opacity: ${isUnlocked ? 1 : 0.6};">
                <div class="badge-icon" style="font-size: 32px; filter: ${isUnlocked ? 'none' : 'grayscale(1) brightness(0.6)'};">
                    ${badge.icon}
                </div>
                <div style="flex:1;">
                    <div style="font-weight: 700; font-size: 14px; color: ${isUnlocked ? 'var(--text)' : 'var(--muted)'};">
                        ${badge.name} ${isUnlocked ? '🔓' : '🔒'}
                    </div>
                    <div class="text-muted" style="font-size: 11px; margin-top:2px;">
                        ${badge.desc}
                    </div>
                    <div style="font-size: 10px; margin-top:6px; font-family:'DM Mono', monospace; color: ${isUnlocked ? 'var(--green)' : 'var(--muted)'};">
                        ${badge.req}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function calculateAchievementStats() {
    const state = getState();
    const habits = state.habits || [];
    
    // Get all completed history across all habits
    let totalCompletions = 0;
    habits.forEach(h => {
        if (h.completedDays) {
            totalCompletions += Object.values(h.completedDays).filter(v => v === true).length;
        }
    });

    return {
        totalCompletions,
        bestStreak: state.stats.streak, // Simplified for now
        totalHabits: habits.length,
        level: state.stats.level,
        allDoneInADay: false, // Placeholder
        creditsUsed: 0,      // Placeholder
        loginStreak: 1       // Placeholder
    };
}

function checkAllBadges(stats) {
    let count = 0;
    BADGES.forEach(badge => {
        if (isBadgeUnlocked(badge, stats)) count++;
    });
    return count;
}

function isBadgeUnlocked(badge, stats) {
    switch (badge.id) {
        case 'first_step':      return stats.totalCompletions >= 1;
        case 'on_a_roll':       return stats.bestStreak >= 3;
        case 'week_warrior':    return stats.bestStreak >= 7;
        case 'monthly_master':  return stats.bestStreak >= 30;
        case 'getting_started': return stats.totalCompletions >= 10;
        case 'half_century':    return stats.totalCompletions >= 50;
        case 'centurion':       return stats.totalCompletions >= 100;
        case 'legendary':       return stats.totalCompletions >= 500;
        case 'xp_hunter':       return stats.level >= 5;
        case 'habit_builder':   return stats.totalHabits >= 5;
        default:                return false; // placeholder for others
    }
}
