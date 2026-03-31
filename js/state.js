/**
 * state.js
 * Single in-memory state store for the app.
 * Never mutate _state directly — always use updateState().
 */

import { CONFIG } from './config.js';

let _state = {
    selectedDate: new Date().toISOString().split("T")[0],
    habits: [],
    storageKey: "habits_guest",
    stats: {
        totalXP:       0,
        level:         1,
        streak:        0,
        freezeCredits: CONFIG.MAX_FREEZE_CREDITS
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
        selectedDate: new Date().toISOString().split("T")[0],
        habits:       [],
        storageKey:   "habits_guest",
        stats: {
            totalXP:       0,
            level:         1,
            streak:        0,
            freezeCredits: CONFIG.MAX_FREEZE_CREDITS
        }
    };
}
