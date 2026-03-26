/**
 * Centralized Storage Service
 * Handles all localStorage operations safely with error catching
 * and automatic JSON serialization/deserialization.
 */

export function saveData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error("Storage Error (saveData):", error);
        return false;
    }
}

export function getData(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        try {
            return JSON.parse(item);
        } catch (parseErr) {
            return item; // Fallback for raw strings
        }
    } catch (error) {
        console.error("Storage Error (getData):", error);
        return defaultValue;
    }
}

export function removeData(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error("Storage Error (removeData):", error);
        return false;
    }
}
