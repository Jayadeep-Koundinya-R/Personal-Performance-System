import { getData, removeData } from './storageService.js';

export function checkAuth() {
    const user = getData("currentUser");

    if (!user) {
        window.location.href = "login.html";
        return null;
    }

    // Guest session expiry check
    if (user.isGuest && Date.now() > user.expiry) {
        removeData("currentUser");
        window.location.href = "login.html";
        return null;
    }

    return user;
}