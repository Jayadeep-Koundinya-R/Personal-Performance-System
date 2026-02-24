/* ================= AUTH CHECK ================= */

function checkAuth() {
    const user = JSON.parse(localStorage.getItem("currentUser"));

    if (!user) {
        window.location.href = "login.html";
        return null;
    }

    if (user.isGuest && Date.now() > user.expiry) {
        alert("Guest session expired");
        localStorage.removeItem("currentUser");
        window.location.href = "login.html";
        return null;
    }

    return user;
}
