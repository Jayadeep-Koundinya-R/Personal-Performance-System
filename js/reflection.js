import { getState } from './state.js';
import { getData, saveData } from './storageService.js';

/* ---------- HELPERS ---------- */
function _getUser() {
    return getData("currentUser", {});
}
function _rflKey() { var u = _getUser(); return "reflections_" + (u.email || "guest"); }

function _showStatus(id, msg, ok) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "#22c55e" : "#ef4444";
    clearTimeout(el._t);
    el._t = setTimeout(function() { el.textContent = ""; }, 3000);
}

/* ---------- REFLECTIONS ---------- */
var rfl_mood = "great";

export function rfl_setMood(el, mood) {
    rfl_mood = mood;
    var ids = ["rfl_m_great", "rfl_m_okay", "rfl_m_low", "rfl_m_stress"];
    ids.forEach(function(id) {
        var e = document.getElementById(id);
        if (e) e.style.opacity = "0.4";
    });
    el.style.opacity = "1";
}

export function rfl_save() {
    var ta   = document.getElementById("rfl_text");
    var text = ta ? ta.value.trim() : "";
    if (!text) { _showStatus("rfl_status", "Write something first.", false); return; }

    var key   = _rflKey();
    var list = getData(key, []);

    var today = new Date().toISOString().split("T")[0];
    var idx   = -1;
    for (var i = 0; i < list.length; i++) {
        if (list[i].date === today) { idx = i; break; }
    }

    /* snapshot habit completions */
    var habLog = [];
    try {
        const { habits } = getState();
        if (typeof habits !== "undefined") {
            habits.forEach(function(h) {
                habLog.push({ name: h.name, completed: (h.completedDates || []).indexOf(today) >= 0 });
            });
        }
    } catch(e) {}

    var entry = { date: today, text: text, mood: rfl_mood || "great", habitsLog: habLog };
    if (idx >= 0) list[idx] = entry;
    else          list.unshift(entry);

    saveData(key, list);

    if (ta) ta.value = "";
    rfl_mood = "great";
    ["rfl_m_great","rfl_m_okay","rfl_m_low","rfl_m_stress"].forEach(function(id, i) {
        var e = document.getElementById(id);
        if (e) e.style.opacity = i === 0 ? "1" : "0.4";
    });

    _showStatus("rfl_status", "Saved ✓", true);
    rfl_render();
}

export function rfl_render() {
    var container = document.getElementById("rfl_list");
    if (!container) return;

    var list = getData(_rflKey(), []);

    if (list.length === 0) {
        container.innerHTML =
            "<div style=\"text-align:center;padding:32px;color:#64748b;font-size:13px;\">" +
            "<div style=\"font-size:32px;margin-bottom:10px;\">📝</div>" +
            "No reflections yet — write your first one above.</div>";
        return;
    }

    var moodLabel = { great: "😊 Great", okay: "😐 Okay", low: "😔 Low", stress: "😤 Stressed" };
    var html = "";
    list.forEach(function(entry) {
        var d    = new Date(entry.date + "T12:00:00");
        var dstr = d.toLocaleDateString("en-GB", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
        var chips = "";
        (entry.habitsLog || []).forEach(function(h) {
            chips += "<span class=\"mood-chip\">" + h.name + " " + (h.completed ? "✅" : "❌") + "</span>";
        });
        var ml = moodLabel[entry.mood] || entry.mood;

        html +=
            "<div class=\"reflection-card\">" +
            "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\">" +
            "<div class=\"reflection-date\">" + dstr + "</div>" +
            "<button class=\"danger-btn\" style=\"padding:3px 10px;font-size:11px;\"" +
            " data-date=\"" + entry.date + "\" onclick=\"rfl_delete(this.dataset.date)\">Delete</button>" +
            "</div>" +
            "<div class=\"reflection-text\">" + entry.text + "</div>" +
            "<div class=\"mood-row\" style=\"margin-top:10px;\">" +
            "<span class=\"mood-chip\">" + ml + "</span>" + chips +
            "</div></div>";
    });
    container.innerHTML = html;
}

export function rfl_delete(date) {
    if (!confirm("Delete this reflection?")) return;
    var key  = _rflKey();
    var list = getData(key, []);
    list = list.filter(function(r) { return r.date !== date; });
    saveData(key, list);
    rfl_render();
}

export function setupReflections() {
    rfl_render();
}