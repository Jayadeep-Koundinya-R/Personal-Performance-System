/* ================= STATE ================= */
import { CONFIG } from './config.js';

let _state = {
    selectedDate: new Date().toISOString().split("T")[0],
    habits: [],
    stats: {
        totalXP: 0,
        level: 1,
        streak: 0,
        freezeCredits: CONFIG.MAX_FREEZE_CREDITS || 2
    }
};

// 1. Export the state object via a Proxy
// 2. Prevent direct mutation by intercepting 'set' operations
export const state = new Proxy(_state, {
    set: function (target, property, value) {
        console.error("Direct mutation is not allowed! Use updateState() or specific setter functions.");
        return false;
    }
});

// 3. Getter function
export function getState() {
    return _state;
}

// 3. Setter function
export function updateState(newData) {
    _state = { ..._state, ...newData };
}

// 4. Keep existing logic working (Legacy helpers)
export function stateSetHabits(list) {
    _state.habits = list;
}

export function stateGetHabits() {
    return _state.habits;
}