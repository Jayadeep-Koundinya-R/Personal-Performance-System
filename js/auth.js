/**
 * auth.js
 * Authentication helpers used by both login page and dashboard guard.
 *
 * Passwords are hashed with SHA-256 via the Web Crypto API before
 * being stored in localStorage. Plain-text passwords are never saved.
 */

import { getData, saveData, removeData } from './storageService.js';

/* ── Hash a password string → hex string (async) ── */
export async function hashPassword(password) {
    const encoded = new TextEncoder().encode(password);
    const buffer  = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

/* ── Auth guard — call at the top of every protected page ── */
export function checkAuth() {
    const user = getData("currentUser");
    if (!user) {
        window.location.href = "login.html";
        return null;
    }
    // Guest session expiry
    if (user.isGuest && Date.now() > user.expiry) {
        removeData("currentUser");
        window.location.href = "login.html";
        return null;
    }
    return user;
}

/* ── User store helpers (used by login page) ── */
export function getUsers()        { return getData("pps_users", []); }
export function saveUsers(users)  { saveData("pps_users", users); }
export function setCurrentUser(u) { saveData("currentUser", u); }
