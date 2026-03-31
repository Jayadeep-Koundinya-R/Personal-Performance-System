/**
 * storageService.js
 * Centralized localStorage wrapper — all reads/writes go through here.
 * Handles JSON serialization, parse errors, and quota exceptions.
 */

export function saveData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (err) {
        console.error("[Storage] saveData failed:", key, err);
        return false;
    }
}

export function getData(key, defaultValue = null) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return defaultValue;
        try { return JSON.parse(raw); }
        catch { return raw; }          // fallback for raw strings
    } catch (err) {
        console.error("[Storage] getData failed:", key, err);
        return defaultValue;
    }
}

export function removeData(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (err) {
        console.error("[Storage] removeData failed:", key, err);
        return false;
    }
}

/** Returns total bytes used by localStorage (approximate). */
export function getStorageSize() {
    try {
        let total = 0;
        for (const key of Object.keys(localStorage)) {
            total += (localStorage.getItem(key) || "").length * 2; // UTF-16
        }
        return total;
    } catch {
        return 0;
    }
}
