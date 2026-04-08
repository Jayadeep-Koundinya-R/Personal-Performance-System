/* ================= CONFIG =================
   Global constants — single source of truth.
   Import this anywhere you need app-wide settings.
   ================================================== */

export const CONFIG = {
    XP_PER_COMPLETION:   10,
    LEVEL_XP_THRESHOLD:  100,
    MAX_FREEZE_CREDITS:  2,
    STREAK_RESET_HOUR:   0   // midnight
};

const SETTINGS_KEY_PREFIX = 'pps_settings_';
let cachedSettingsKey = null;
let cachedSettings = null;

function getStorageApi() {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

export function getDefaultSettings() {
    return {
        xpPerCompletion: CONFIG.XP_PER_COMPLETION,
        levelXpThreshold: CONFIG.LEVEL_XP_THRESHOLD,
        maxFreezeCredits: CONFIG.MAX_FREEZE_CREDITS
    };
}

function getSettingsStorageKey() {
    const storage = getStorageApi();
    let userEmail = 'guest';

    try {
        const raw = storage?.getItem('currentUser');
        if (raw) {
            const user = JSON.parse(raw);
            userEmail = user?.email || 'guest';
        }
    } catch {
        userEmail = 'guest';
    }

    return `${SETTINGS_KEY_PREFIX}${userEmail}`;
}

function clampNumber(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(Math.round(parsed), min), max);
}

function normalizeSettings(settings = {}) {
    const defaults = getDefaultSettings();
    return {
        xpPerCompletion: clampNumber(settings.xpPerCompletion, defaults.xpPerCompletion, 1, 999),
        levelXpThreshold: defaults.levelXpThreshold,
        maxFreezeCredits: clampNumber(settings.maxFreezeCredits, defaults.maxFreezeCredits, 0, 30)
    };
}

export function getAppSettings() {
    const settingsKey = getSettingsStorageKey();
    if (cachedSettings && cachedSettingsKey === settingsKey) {
        return { ...cachedSettings };
    }

    const storage = getStorageApi();
    let stored = {};
    try {
        stored = JSON.parse(storage?.getItem(settingsKey) || '{}');
    } catch {
        stored = {};
    }

    cachedSettingsKey = settingsKey;
    cachedSettings = { ...getDefaultSettings(), ...normalizeSettings(stored) };
    return { ...cachedSettings };
}

export function saveAppSettings(settingsPatch = {}) {
    const settingsKey = getSettingsStorageKey();
    const storage = getStorageApi();
    const normalized = normalizeSettings({ ...getAppSettings(), ...settingsPatch });

    try {
        storage?.setItem(settingsKey, JSON.stringify(normalized));
    } catch {}

    cachedSettingsKey = settingsKey;
    cachedSettings = normalized;
    return { ...normalized };
}
