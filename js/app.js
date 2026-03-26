import { getData, saveData } from './storageService.js';
/* ================================================
   app.js  —  Sidebar hamburger + PDF Export

   HOW THE HAMBURGER WORKS (unified, any screen):
   ─────────────────────────────────────────────
   The hamburger button lives permanently in
   .sidebar-header — top-left of the sidebar on
   every screen size. There is no separate mobile
   topbar at all.

   DESKTOP (> 768px)
     Sidebar is a normal flex item (always rendered).
     Click hamburger → toggles .collapsed on sidebar.
     Collapsed = sidebar shrinks to 58px (icon-only).
     Expanded  = sidebar restores to full --sidebar-w.
     Overlay is never shown on desktop.

   MOBILE (≤ 768px)
     Sidebar is a fixed overlay, starts off-screen.
     Click hamburger → .open → slides in.
     Tap overlay / nav item / ESC → closes.
     .collapsed class unused on mobile.
================================================ */

var MOBILE_BP = 768;

function isMobile() {
    return window.innerWidth <= MOBILE_BP;
}

/* ── Main toggle — called by onclick on hamburger button ── */
export function toggleMobileSidebar() {
    if (isMobile()) {
        _mobileToggle();
    } else {
        _desktopToggle();
    }
}

/* ── Desktop: collapse / expand sidebar ── */
function _desktopToggle() {
    var sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    sidebar.classList.toggle("collapsed");
    saveData("pps_sidebar_collapsed", sidebar.classList.contains("collapsed") ? "1" : "0");
}

/* ── Mobile: slide overlay in/out ── */
function _mobileToggle() {
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebarOverlay");
    var fab = document.getElementById("mobileHamburgerBtn");
    if (!sidebar) return;
    if (sidebar.classList.contains("open")) {
        _mobileClose();
    } else {
        sidebar.classList.remove("collapsed");
        sidebar.classList.add("open");
        if (overlay) overlay.classList.add("open");
        if (fab) fab.classList.add("open");    /* animate FAB to X */
        document.body.style.overflow = "hidden";
    }
}

/* ── Mobile: close overlay ── */
function _mobileClose() {
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebarOverlay");
    var fab = document.getElementById("mobileHamburgerBtn");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    if (fab) fab.classList.remove("open");     /* restore FAB to bars */
    document.body.style.overflow = "";
}

/* ── Public close function (called by nav.js too) ── */
export function closeMobileSidebar() {
    if (isMobile()) _mobileClose();
}

/* ── Init ── */
document.addEventListener("DOMContentLoaded", function () {
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebarOverlay");

    /* Restore desktop collapsed state from last session */
    if (sidebar && !isMobile()) {
        if (getData("pps_sidebar_collapsed") === "1") {
            sidebar.classList.add("collapsed");
        }
    }

    /* Overlay tap closes on mobile */
    if (overlay) {
        overlay.addEventListener("click", function () { _mobileClose(); });
    }

    /* Nav item click closes overlay on mobile */
    document.querySelectorAll(".nav-item").forEach(function (item) {
        item.addEventListener("click", function () {
            if (isMobile()) _mobileClose();
        });
    });

    /* Resize: clean up stray classes when crossing breakpoint */
    window.addEventListener("resize", function () {
        if (!isMobile()) {
            _mobileClose();
            document.body.style.overflow = "";
        } else {
            if (sidebar) sidebar.classList.remove("collapsed");
        }
    });

    /* ESC: close mobile overlay, or expand collapsed desktop sidebar */
    document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        if (isMobile()) {
            _mobileClose();
        } else if (sidebar && sidebar.classList.contains("collapsed")) {
            sidebar.classList.remove("collapsed");
            saveData("pps_sidebar_collapsed", "0");
        }
    });
});


/* ================================================
   PDF EXPORT
================================================ */
export function exportToPDF() {
    var user = getData("currentUser", {});
    var name = user.name || user.email || "User";
    var today = new Date().toLocaleDateString("en-GB", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric"
    });

    var habitsKey = "habits_" + (user.email || "guest");
    var habitList = getData(habitsKey, []);

    var totalXP = habitList.reduce(function (s, h) { return s + (h.completedDates || []).length * 10; }, 0);
    var level = Math.floor(totalXP / 100) + 1;
    var bestStreak = habitList.reduce(function (s, h) { return Math.max(s, h.streak || 0); }, 0);
    var totalDone = habitList.reduce(function (s, h) { return s + (h.completedDates || []).length; }, 0);

    var habitRows = habitList.map(function (h) {
        var done = (h.completedDates || []).length;
        var rate = done > 0 ? Math.min(100, Math.round((done / 7) * 100)) : 0;
        var priColor = h.priority === "High" ? "#ef4444"
            : h.priority === "Medium" ? "#eab308"
                : h.priority === "Low" ? "#22c55e" : "#94a3b8";
        return "<tr>" +
            "<td>" + h.name + "</td>" +
            "<td>" + (h.category || "-") + "</td>" +
            "<td>" + (h.period || "Daily") + "</td>" +
            "<td style='color:" + priColor + ";font-weight:600;'>" + (h.priority || "-") + "</td>" +
            "<td>" + (h.streak || 0) + " days</td>" +
            "<td>" + done + " times</td>" +
            "<td>" +
            "<div style='background:#e2e8f0;border-radius:4px;height:8px;width:80px;" +
            "display:inline-block;vertical-align:middle;'>" +
            "<div style='background:#6366f1;border-radius:4px;height:8px;width:" + rate + "%;'></div>" +
            "</div> " + rate + "%" +
            "</td></tr>";
    }).join("");

    if (!habitRows) {
        habitRows = "<tr><td colspan='7' style='text-align:center;color:#94a3b8;'>No habits yet.</td></tr>";
    }

    var css = [
        "body{font-family:Arial,sans-serif;background:#f8fafc;color:#1e293b;margin:0;padding:0;}",
        ".cover{background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;padding:60px 50px;}",
        ".cover h1{font-size:36px;margin:0 0 8px;}",
        ".cover p{font-size:14px;opacity:.7;margin:4px 0;}",
        ".stats-row{display:flex;gap:20px;margin-top:36px;flex-wrap:wrap;}",
        ".stat{background:rgba(255,255,255,.12);border-radius:12px;padding:18px 24px;text-align:center;min-width:100px;}",
        ".stat .num{font-size:28px;font-weight:700;font-family:monospace;}",
        ".stat .lbl{font-size:11px;opacity:.7;margin-top:4px;}",
        ".section{padding:40px 50px;}",
        ".section h2{font-size:20px;font-weight:700;margin-bottom:20px;color:#1e293b;border-bottom:2px solid #6366f1;padding-bottom:10px;}",
        "table{width:100%;border-collapse:collapse;font-size:13px;}",
        "th{background:#1e1b4b;color:#fff;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;}",
        "td{padding:10px 14px;border-bottom:1px solid #e2e8f0;}",
        "tr:nth-child(even) td{background:#f1f5f9;}",
        ".footer{text-align:center;padding:28px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;}"
    ].join("");

    var reportHTML =
        "<!DOCTYPE html><html><head><meta charset='UTF-8'>" +
        "<title>PPS Report - " + name + "</title>" +
        "<style>" + css + "</style></head><body>" +
        "<div class='cover'>" +
        "<p style='font-size:11px;letter-spacing:.1em;opacity:.6;text-transform:uppercase;'>Personal Performance System</p>" +
        "<h1>Performance Report</h1>" +
        "<p style='font-size:18px;margin-top:8px;'>User: " + name + "</p>" +
        "<p>" + today + "</p>" +
        "<div class='stats-row'>" +
        "<div class='stat'><div class='num'>" + level + "</div><div class='lbl'>Level</div></div>" +
        "<div class='stat'><div class='num'>" + totalXP + "</div><div class='lbl'>Total XP</div></div>" +
        "<div class='stat'><div class='num'>" + bestStreak + "</div><div class='lbl'>Best Streak</div></div>" +
        "<div class='stat'><div class='num'>" + totalDone + "</div><div class='lbl'>Completions</div></div>" +
        "<div class='stat'><div class='num'>" + habitList.length + "</div><div class='lbl'>Habits</div></div>" +
        "</div></div>" +
        "<div class='section'>" +
        "<h2>Habit Details</h2>" +
        "<table><thead><tr>" +
        "<th>Habit</th><th>Category</th><th>Period</th><th>Priority</th><th>Streak</th><th>Completions</th><th>Success Rate</th>" +
        "</tr></thead><tbody>" + habitRows + "</tbody></table>" +
        "</div>" +
        "<div class='footer'>Generated by PPS — Personal Performance System | " + today + "</div>" +
        "</body></html>";

    try {
        var win = window.open("", "_blank");
        if (!win) throw new Error("popup blocked");
        win.document.open();
        win.document.write(reportHTML);
        win.document.close();
        setTimeout(function () { win.focus(); win.print(); }, 800);
    } catch (e) {
        var blob = new Blob([reportHTML], { type: "text/html" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = "PPS_Report.html"; a.click();
        URL.revokeObjectURL(url);
    }
}