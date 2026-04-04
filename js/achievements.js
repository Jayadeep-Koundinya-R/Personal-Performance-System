/**
 * PPS — Achievements Module
 * Manages badge definitions, progress tracking, and rendering
 */

import { getState } from './state.js';
import { getData } from './storageService.js';

const BADGES = [
    { id: 'first_step',      name: 'First Step',      desc: 'Complete your first habit.', icon: '🌱', hint: 'Complete 1 habit to unlock',   target: 1 },
    { id: 'on_a_roll',       name: 'On a Roll',       desc: 'Achieve a 3-day streak.',   icon: '🔥', hint: 'Achieve a 3-day streak to unlock',   target: 3 },
    { id: 'week_warrior',    name: 'Week Warrior',    desc: 'Achieve a 7-day streak.',   icon: '⚔️', hint: 'Achieve a 7-day streak to unlock',   target: 7 },
    { id: 'monthly_master',  name: 'Monthly Master',  desc: 'Achieve a 30-day streak.',  icon: '🏆', hint: 'Achieve a 30-day streak to unlock',  target: 30 },
    { id: 'getting_started', name: 'Getting Started', desc: 'Reach 10 completions.',     icon: '✅', hint: 'Complete 10 habits to unlock',  target: 10 },
    { id: 'half_century',    name: 'Half Century',    desc: 'Reach 50 completions.',     icon: '🎯', hint: 'Complete 50 habits to unlock',  target: 50 },
    { id: 'centurion',       name: 'Centurion',       desc: 'Reach 100 completions.',    icon: '💯', hint: 'Complete 100 habits to unlock', target: 100 },
    { id: 'legendary',       name: 'Legendary',       desc: 'Reach 500 completions.',    icon: '👑', hint: 'Complete 500 habits to unlock', target: 500 },
    { id: 'perfect_day',     name: 'Perfect Day',     desc: 'All habits done in a day.', icon: '⭐', hint: 'Complete all habits in a single day to unlock',  target: 100 },
    { id: 'habit_builder',   name: 'Habit Builder',   desc: 'Have 5 habits active.',      icon: '📋', hint: 'Track 5 active habits to unlock', target: 5 },
    { id: 'streak_master',   name: 'Streak Master',   desc: 'Use a freeze credit.',      icon: '❄️', hint: 'Use 1 freeze credit to unlock',    target: 1 },
    { id: 'xp_hunter',       name: 'XP Hunter',       desc: 'Reach level 5.',            icon: '⬆️', hint: 'Reach level 5 to unlock',   target: 5 },
    { id: 'dedication',      name: 'Dedication',      desc: 'Log in 7 days in a row.',   icon: '📅', hint: 'Log in 7 days in a row to unlock',     target: 7 }
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

    const unlockedBadges = BADGES.filter(b => isBadgeUnlocked(b, stats));
    const lockedBadges = BADGES.filter(b => !isBadgeUnlocked(b, stats));

    let html = '';

    // Unlocked Section (Always show header)
    html += `<h3 style="grid-column: 1/-1; font-size:12px; text-transform:uppercase; color:var(--accent); letter-spacing:1px; margin: 100px 0 5px 0;">🏆 Earned Badges</h3>`;
    if (unlockedBadges.length > 0) {
        html += unlockedBadges.map(badge => renderBadge(badge, true, stats)).join('');
    } else {
        html += `<div class="card" style="grid-column: 1/-1; padding: 20px; text-align: center; color: var(--muted); border: 1px dashed var(--border);">Complete your first habit to earn your first badge!</div>`;
    }

    // Locked Section
    if (lockedBadges.length > 0) {
        html += `<h3 style="grid-column: 1/-1; font-size:12px; text-transform:uppercase; color:var(--muted); letter-spacing:1px; margin: 25px 0 5px 0;">🔒 Locked Badges</h3>`;
        html += lockedBadges.map(badge => renderBadge(badge, false, stats)).join('');
    }

    grid.innerHTML = html;
}

function getBadgeProgress(badge, stats) {
    let current = 0;
    switch (badge.id) {
        case 'first_step':
        case 'getting_started': 
        case 'half_century':    
        case 'centurion':       
        case 'legendary':       current = stats.totalCompletions; break;
        case 'on_a_roll':       
        case 'week_warrior':    
        case 'monthly_master':  current = stats.bestStreak; break;
        case 'xp_hunter':       current = stats.level; break;
        case 'habit_builder':   current = stats.totalHabits; break;
        case 'streak_master':   current = stats.creditsUsed; break;
        case 'perfect_day':     current = stats.allDoneInADay ? 100 : 0; break;
        case 'dedication':      current = stats.loginStreak; break;
    }
    return Math.min(current, badge.target);
}

function renderBadge(badge, isUnlocked, stats) {
    const current = getBadgeProgress(badge, stats);
    const cleanHint = badge.hint.replace(' to unlock', '');
    const progressText = isUnlocked ? 'Requirement met ✓' : `${cleanHint} · ${current}/${badge.target}`;

    return `
        <div class="card badge-card ${isUnlocked ? 'unlocked' : 'locked'}" 
             style="display:flex; align-items:center; gap:16px; padding:16px; transition:all 0.3s; opacity: ${isUnlocked ? 1 : 0.65}; position: relative; overflow: hidden;">
            ${!isUnlocked ? '<div style="position:absolute; top:8px; right:8px; font-size:12px; opacity:0.5;">🔒</div>' : ''}
            <div class="badge-icon" style="font-size: 32px; filter: ${isUnlocked ? 'none' : 'grayscale(1) brightness(0.6)'};">
                ${badge.icon}
            </div>
            <div style="flex:1;">
                <div style="font-weight: 700; font-size: 14px; color: ${isUnlocked ? 'var(--text)' : 'var(--muted)'};">
                    ${badge.name}
                </div>
                <div class="text-muted" style="font-size: 11px; margin-top:2px;">
                    ${badge.desc}
                </div>
                <div style="font-size: 10px; margin-top:6px; font-family:'DM Mono', monospace; color: ${isUnlocked ? 'var(--green)' : 'var(--muted)'};">
                    ${progressText}
                </div>
            </div>
        </div>
    `;
}

function calculateAchievementStats() {
    const state = getState();
    const habits = state.habits || [];
    const stats = state.stats || {};
    
    // Get all completed history across all habits
    let totalCompletions = 0;
    habits.forEach(h => {
        if (h.completedDates) {
            totalCompletions += h.completedDates.length;
        }
    });

    return {
        totalCompletions,
        bestStreak: stats.streak || 0,
        totalHabits: habits.length,
        level: stats.level || 1,
        allDoneInADay: !!(stats.perfectDays && stats.perfectDays.length > 0),
        creditsUsed: stats.totalCreditsUsed || 0,
        loginStreak: stats.loginStreak || 1
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
        case 'perfect_day':     return stats.allDoneInADay;
        case 'xp_hunter':       return stats.level >= 5;
        case 'habit_builder':   return stats.totalHabits >= 5;
        case 'streak_master':   return stats.creditsUsed >= 1;
        case 'dedication':      return stats.loginStreak >= 7;
        default:                return false;
    }
}
