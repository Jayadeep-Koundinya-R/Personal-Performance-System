import { getData, saveData } from './storageService.js';

/* ---------- HELPERS ---------- */
function _getUser() {
    return getData("currentUser", {});
}
function _remKey() { var u = _getUser(); return "reminders_"   + (u.email || "guest"); }

function _showStatus(id, msg, ok) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "#22c55e" : "#ef4444";
    clearTimeout(el._t);
    el._t = setTimeout(function() { el.textContent = ""; }, 3000);
}

/* ---------- REMINDERS ---------- */
export function rem_save() {
    var labelEl  = document.getElementById("rem_label");
    var timeEl   = document.getElementById("rem_time");
    var repeatEl = document.getElementById("rem_repeat");

    var label  = labelEl  ? labelEl.value.trim() : "";
    var time   = timeEl   ? timeEl.value         : "";
    var repeat = repeatEl ? repeatEl.value       : "Every Day";

    if (!label) { _showStatus("rem_status", "Enter a label.", false); return; }
    if (!time)  { _showStatus("rem_status", "Pick a time.",   false); return; }

    var key  = _remKey();
    var list = getData(key, []);

    list.push({ id: Date.now(), label: label, time: time, repeat: repeat, enabled: true });
    saveData(key, list);

    if (labelEl) labelEl.value = "";
    if (timeEl)  timeEl.value  = "";
    _showStatus("rem_status", "Saved ✓", true);
    rem_render();
}

export function rem_render() {
    var container = document.getElementById("rem_list");
    if (!container) return;

    var list = getData(_remKey(), []);

    if (list.length === 0) {
        container.innerHTML =
            "<div style=\"text-align:center;padding:24px;color:#64748b;font-size:13px;\">" +
            "<div style=\"font-size:28px;margin-bottom:8px;\">🔔</div>" +
            "No reminders yet — add one below.</div>";
        return;
    }

    var html = "";
    list.forEach(function(r) {
        var parts = (r.time || "00:00").split(":").map(Number);
        var hh = parts[0], mm = parts[1];
        var ampm = hh >= 12 ? "PM" : "AM";
        var h12  = hh % 12 || 12;
        var tstr = (h12 < 10 ? "0" : "") + h12 + ":" + (mm < 10 ? "0" : "") + mm + " " + ampm;

        html +=
            "<div class=\"reminder-row\">" +
            "<div>" +
            "<div style=\"font-size:14px;font-weight:600;\">" + r.label + "</div>" +
            "<div style=\"font-size:12px;color:#64748b;\">" + r.repeat + "</div>" +
            "</div>" +
            "<div style=\"display:flex;align-items:center;gap:16px;\">" +
            "<span class=\"reminder-time\">" + tstr + "</span>" +
            "<div class=\"toggle " + (r.enabled ? "on" : "") + "\" data-id=\"" + r.id + "\" onclick=\"rem_toggle(this)\" style=\"cursor:pointer;\">" +
            "<div class=\"toggle-dot\"></div></div>" +
            "<button class=\"danger-btn\" style=\"padding:4px 10px;font-size:11px;\" data-id=\"" + r.id + "\" onclick=\"rem_delete(this)\">✕</button>" +
            "</div></div>";
    });
    container.innerHTML = html;
}

export function rem_toggle(el) {
    var id   = Number(el.dataset.id);
    var key  = _remKey();
    var list = getData(key, []);
    list.forEach(function(r) { if (r.id === id) r.enabled = !r.enabled; });
    saveData(key, list);
    rem_render();
}

export function rem_delete(el) {
    var id = Number(el.dataset.id);
    if (!confirm("Delete this reminder?")) return;
    var key  = _remKey();
    var list = getData(key, []);
    list = list.filter(function(r) { return r.id !== id; });
    saveData(key, list);
    rem_render();
}

export function setupReminders() {
    rem_render();
}