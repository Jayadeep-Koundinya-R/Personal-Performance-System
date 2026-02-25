/* ============================================================
   REFLECTIONS
   No addEventListener — buttons call functions directly via
   onclick attributes in HTML. Nothing can silently un-wire.
   ============================================================ */

let selectedMood = "great";

/* ── KEY ── derived fresh every call from localStorage ── */
function getReflectionKey() {
    try {
        const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
        return "reflections_" + (u.email || "guest");
    } catch(e) { return "reflections_guest"; }
}

/* ── INIT ── only sets up mood picker visuals ── */
function setupReflections() {
    const picks = document.querySelectorAll(".mood-pick");
    picks.forEach((el, i) => {
        el.style.opacity    = i === 0 ? "1" : "0.4";
        el.style.cursor     = "pointer";
        el.style.transition = "opacity 0.15s";
        el.addEventListener("click", () => {
            picks.forEach(m => m.style.opacity = "0.4");
            el.style.opacity = "1";
            selectedMood = el.dataset.mood;
        });
    });
    renderReflections();
}

/* ── SAVE ── called by onclick on the Save button ── */
function saveReflection() {
    const ta   = document.getElementById("reflectionText");
    const text = ta ? ta.value.trim() : "";

    if (!text) {
        setReflectionStatus("Please write something first.", false);
        return;
    }

    const key      = getReflectionKey();
    const today    = new Date().toISOString().split("T")[0];
    const existing = (() => {
        try { return JSON.parse(localStorage.getItem(key)) || []; }
        catch(e) { return []; }
    })();

    const idx   = existing.findIndex(r => r.date === today);
    const entry = {
        date:      today,
        text:      text,
        mood:      selectedMood || "great",
        habitsLog: (typeof habits !== "undefined" ? habits : []).map(h => ({
            name:      h.name,
            completed: Array.isArray(h.completedDates) && h.completedDates.includes(today)
        }))
    };

    if (idx >= 0) existing[idx] = entry;
    else          existing.unshift(entry);

    localStorage.setItem(key, JSON.stringify(existing));

    // Clear textarea and reset mood
    if (ta) ta.value = "";
    selectedMood = "great";
    document.querySelectorAll(".mood-pick").forEach((m, i) => {
        m.style.opacity = i === 0 ? "1" : "0.4";
    });

    setReflectionStatus("Saved ✓", true);
    renderReflections();
}

/* ── STATUS MESSAGE ── writes into the fixed <span> in HTML ── */
function setReflectionStatus(msg, ok) {
    const el = document.getElementById("reflectionStatus");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "var(--green)" : "var(--red)";
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ""; }, 3000);
}

/* ── GET ── */
function getReflections() {
    try {
        return JSON.parse(localStorage.getItem(getReflectionKey())) || [];
    } catch(e) { return []; }
}

/* ── RENDER ── */
function renderReflections() {
    const list = document.getElementById("reflectionList");
    if (!list) return;

    const entries = getReflections();
    if (entries.length === 0) {
        list.innerHTML = `
            <div style="text-align:center;padding:32px;color:var(--muted);font-size:13px;">
                <div style="font-size:32px;margin-bottom:10px;">📝</div>
                No reflections yet — write your first one above.
            </div>`;
        return;
    }

    list.innerHTML = "";
    entries.forEach(entry => {
        const card = document.createElement("div");
        card.className = "reflection-card";

        const dateLabel = new Date(entry.date + "T12:00:00")
            .toLocaleDateString("en-GB", {
                weekday:"long", day:"2-digit", month:"long", year:"numeric"
            });

        const moodLabels = { great:"😊 Great", okay:"😐 Okay", low:"😔 Low", stress:"😤 Stressed" };

        const chips = (entry.habitsLog || [])
            .map(h => `<span class="mood-chip">${h.name} ${h.completed?"✅":"❌"}</span>`)
            .join("");

        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div class="reflection-date">${dateLabel}</div>
                <button class="danger-btn" style="padding:3px 10px;font-size:11px;"
                    onclick="deleteReflection('${entry.date}')">Delete</button>
            </div>
            <div class="reflection-text">${entry.text}</div>
            <div class="mood-row" style="margin-top:10px;">
                <span class="mood-chip">${moodLabels[entry.mood] || entry.mood}</span>
                ${chips}
            </div>`;

        list.appendChild(card);
    });
}

/* ── DELETE ── */
function deleteReflection(date) {
    if (!confirm("Delete this reflection?")) return;
    const key     = getReflectionKey();
    const updated = getReflections().filter(r => r.date !== date);
    localStorage.setItem(key, JSON.stringify(updated));
    renderReflections();
}