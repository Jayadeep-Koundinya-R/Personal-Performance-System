/**
 * state.js
 * Single in-memory state store for the app.
 * Never mutate _state directly — always use updateState().
 */

import { CONFIG } from './config.js';

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

let _state = {
    selectedDate: getLocalDateKey(new Date()),
    habits: [],
    storageKey: "habits_guest",
    stats: {
        totalXP:       0,
        level:         1,
        streak:        0,
        freezeCredits: CONFIG.MAX_FREEZE_CREDITS,
        totalCreditsUsed: 0,
        perfectDays: [],
        loginStreak: 1,
        lastLoginDate: null
    }
};

export function getState() {
    return _state;
}

export function updateState(patch) {
    _state = { ..._state, ...patch };
}

export function resetState() {
    _state = {
        selectedDate: getLocalDateKey(new Date()),
        habits:       [],
        storageKey:   "habits_guest",
        stats: {
            totalXP:       0,
            level:         1,
            streak:        0,
            freezeCredits: CONFIG.MAX_FREEZE_CREDITS,
            totalCreditsUsed: 0,
            perfectDays: [],
            loginStreak: 1,
            lastLoginDate: null
        }
    };
}

