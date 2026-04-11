/**
 * PPS - Social Module
 * Updates the live user stats in the social section.
 * Full leaderboard requires backend — demo rows are static HTML.
 */

import { getState } from './state.js';
import { getData } from './storageService.js';
import { calculateTotalXP, calculateLevel } from './utils.js';

export function renderSocial() {
    const state  = getState();
    const habits = state.habits || [];
    const xp     = calculateTotalXP(habits);
    const level  = calculateLevel(habits);

    // Update the "You" row in the static leaderboard HTML
    const levelEl = document.getElementById('socialUserLevel');
    const xpEl    = document.getElementById('socialUserXP');
    if (levelEl) levelEl.textContent = `Level ${level} · ${xp.toLocaleString()} XP`;
    if (xpEl)    xpEl.textContent    = `${xp.toLocaleString()} XP`;
}
