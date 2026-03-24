/* =================================================
   NOTIFICATIONS.JS — PPS Reminder Notifications

   How it works:
   1. User clicks Enable → browser asks permission
   2. Every 10 seconds we check current time (HH:MM)
   3. If time matches an enabled reminder → show popup
   4. Each reminder fires only ONCE per minute
   5. User can Stop notifications anytime
================================================= */

var notif_interval = null;
var notif_running  = false;

/* ── Enable ── */
function notif_requestPermission() {
    if (!("Notification" in window)) {
        notif_setStatus("❌ Browser does not support notifications.", false);
        return;
    }
    if (Notification.permission === "denied") {
        notif_setStatus("❌ Blocked. Chrome Settings → Site Settings → Notifications → Allow this site.", false);
        return;
    }
    if (Notification.permission === "granted") {
        notif_setStatus("✅ Notifications are enabled!", true);
        notif_startChecker();
        return;
    }
    Notification.requestPermission().then(function(result) {
        if (result === "granted") {
            notif_setStatus("✅ Notifications enabled!", true);
            notif_startChecker();
            new Notification("PPS Notifications ON 🔔", {
                body: "You will get a popup at your reminder times.",
                icon: "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f514.png"
            });
        } else {
            notif_setStatus("❌ Permission denied. Reminders won't ring.", false);
        }
    });
}

/* ── Stop ── */
function notif_stop() {
    if (notif_interval) { clearInterval(notif_interval); notif_interval = null; }
    notif_running = false;
    notif_setStatus("🔕 Notifications stopped.", false);
}

/* ── Start checker — every 10 seconds ── */
function notif_startChecker() {
    if (notif_running) return;
    notif_running = true;
    notif_checkReminders();
    notif_interval = setInterval(notif_checkReminders, 10000);
    console.log("PPS: Notification checker started.");
}

/* ── Check current time vs reminders ── */
function notif_checkReminders() {
    if (Notification.permission !== "granted") return;

    var now  = new Date();
    var hh   = now.getHours();
    var mm   = now.getMinutes();
    var time = (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
    var day  = now.getDay();
    var isWeekday = day >= 1 && day <= 5;
    var isWeekend = day === 0 || day === 6;
    var today = now.toISOString().split("T")[0];

    var list = [];
    try { list = JSON.parse(localStorage.getItem(notif_getKey())) || []; } catch(e) {}

    list.forEach(function(r) {
        if (!r.enabled || r.time !== time) return;

        var rep = r.repeat || "Every Day";
        var ok  = rep === "Every Day" ? true
                : rep === "Weekdays"  ? isWeekday
                : rep === "Weekends"  ? isWeekend : true;
        if (!ok) return;

        var fKey = "pps_notif_" + r.id + "_" + today + "_" + time;
        if (sessionStorage.getItem(fKey)) return;
        sessionStorage.setItem(fKey, "1");

        notif_fire(r.label, rep, time);
    });
}

/* ── Show notification ── */
function notif_fire(label, repeat, timeStr) {
    var p    = timeStr.split(":").map(Number);
    var ampm = p[0] >= 12 ? "PM" : "AM";
    var h12  = p[0] % 12 || 12;
    var nice = (h12 < 10 ? "0" : "") + h12 + ":" + (p[1] < 10 ? "0" : "") + p[1] + " " + ampm;

    var n = new Notification("⏰ " + label, {
        body: "Reminder: " + nice + "  •  " + repeat,
        icon: "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/23f0.png",
        tag:  "pps-" + label
    });
    setTimeout(function() { n.close(); }, 8000);
    n.onclick = function() { window.focus(); n.close(); };
    console.log("PPS Notification fired:", label, "@", nice);
}

/* ── Status text in banner ── */
function notif_setStatus(msg, ok) {
    var el = document.getElementById("notif_status");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "#22c55e" : "#ef4444";
}

/* ── localStorage key ── */
function notif_getKey() {
    try { var u = JSON.parse(localStorage.getItem("currentUser")||"{}"); return "reminders_"+(u.email||"guest"); }
    catch(e) { return "reminders_guest"; }
}

/* ── Auto-start on load if permission already granted ── */
document.addEventListener("DOMContentLoaded", function() {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
        notif_startChecker();
        notif_setStatus("✅ Notifications are enabled!", true);
    } else if (Notification.permission === "denied") {
        notif_setStatus("❌ Notifications blocked by browser.", false);
    }
});