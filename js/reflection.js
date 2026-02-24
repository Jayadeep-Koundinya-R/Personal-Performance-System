/* ================= REFLECTIONS ================= */

let selectedMood     = "great";
let reflectionKey    = "";

/* ─────────────────────────────────────
   INIT
───────────────────────────────────── */
function setupReflections(user) {
    reflectionKey = `reflections_${user.email || "guest"}`;

    setupMoodPicker();
    renderReflections();

    const saveBtn = document.getElementById("saveReflectionBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", saveReflection);
    }
}

/* ─────────────────────────────────────
   MOOD PICKER
───────────────────────────────────── */
function setupMoodPicker() {
    const moodPicks = document.querySelectorAll(".mood-pick");

    moodPicks.forEach(el => {
        el.addEventListener("click", () => {
            // dim all
            moodPicks.forEach(m => m.style.opacity = "0.4");
            // highlight selected
            el.style.opacity = "1";
            selectedMood = el.dataset.mood;
        });
    });
}

/* ─────────────────────────────────────
   SAVE
───────────────────────────────────── */
function saveReflection() {
    const text = document.getElementById("reflectionText")?.value.trim();

    if (!text) {
        alert("Write something before saving.");
        return;
    }

    const reflections = getReflections();
    const todayStr    = new Date().toISOString().split("T")[0];

    // one entry per day — overwrite if exists
    const existingIdx = reflections.findIndex(r => r.date === todayStr);

    const entry = {
        date:      todayStr,
        text:      text,
        mood:      selectedMood,
        habitsLog: buildHabitsLog()   // snapshot of today's habit completions
    };

    if (existingIdx >= 0) {
        reflections[existingIdx] = entry;
    } else {
        reflections.unshift(entry); // newest first
    }

    localStorage.setItem(reflectionKey, JSON.stringify(reflections));

    // clear textarea
    const textarea = document.getElementById("reflectionText");
    if (textarea) textarea.value = "";

    renderReflections();
}

/* ─────────────────────────────────────
   GET ALL REFLECTIONS
───────────────────────────────────── */
function getReflections() {
    return JSON.parse(localStorage.getItem(reflectionKey)) || [];
}

/* ─────────────────────────────────────
   HABITS SNAPSHOT FOR TODAY
───────────────────────────────────── */
function buildHabitsLog() {
    const todayStr = new Date().toISOString().split("T")[0];
    return habits.map(h => ({
        name:      h.name,
        completed: h.completedDates.includes(todayStr)
    }));
}

/* ─────────────────────────────────────
   MOOD EMOJI MAP
───────────────────────────────────── */
const moodMap = {
    great:  "😊 Great",
    okay:   "😐 Okay",
    low:    "😔 Low",
    stress: "😤 Stressed"
};

/* ─────────────────────────────────────
   RENDER PAST ENTRIES
───────────────────────────────────── */
function renderReflections() {
    const list = document.getElementById("reflectionList");
    if (!list) return;

    const reflections = getReflections();

    if (reflections.length === 0) {
        list.innerHTML = `<p class="empty-text">No reflections yet — write your first one above.</p>`;
        return;
    }

    list.innerHTML = "";

    reflections.forEach(entry => {
        const card = document.createElement("div");
        card.className = "reflection-card";

        // format date nicely
        const dateLabel = new Date(entry.date + "T00:00:00")
            .toLocaleDateString(undefined, {
                weekday: "long", year: "numeric",
                month:   "long", day: "numeric"
            });

        // habits chips
        const habitChips = (entry.habitsLog || []).map(h => `
            <div class="mood-chip">${h.name} ${h.completed ? "✅" : "❌"}</div>
        `).join("");

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="reflection-date">${dateLabel}</div>
                <button class="danger-btn" style="padding:3px 10px; font-size:11px;"
                    data-date="${entry.date}">Delete</button>
            </div>
            <div class="reflection-text">${entry.text}</div>
            <div class="mood-row">
                <div class="mood-chip">${moodMap[entry.mood] || entry.mood}</div>
                ${habitChips}
            </div>
        `;

        card.querySelector(".danger-btn").addEventListener("click", () => {
            deleteReflection(entry.date);
        });

        list.appendChild(card);
    });
}

/* ─────────────────────────────────────
   DELETE ENTRY
───────────────────────────────────── */
function deleteReflection(date) {
    if (!confirm("Delete this reflection?")) return;
    const reflections = getReflections().filter(r => r.date !== date);
    localStorage.setItem(reflectionKey, JSON.stringify(reflections));
    renderReflections();
}