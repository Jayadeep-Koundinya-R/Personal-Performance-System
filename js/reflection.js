/* ================= REFLECTIONS ================= */

let selectedMood  = "great";
let reflectionKey = "";

function setupReflections(user) {
    reflectionKey = `reflections_${user.email || "guest"}`;
    setupMoodPicker();
    renderReflections();
    document.getElementById("saveReflectionBtn")
        ?.addEventListener("click", saveReflection);
}

function setupMoodPicker() {
    const picks = document.querySelectorAll(".mood-pick");
    picks.forEach(el => {
        el.addEventListener("click", () => {
            picks.forEach(m => m.style.opacity = "0.4");
            el.style.opacity = "1";
            selectedMood = el.dataset.mood;
        });
    });
}

function saveReflection() {
    const text = document.getElementById("reflectionText")?.value.trim();
    if(!text){ alert("Write something before saving."); return; }

    const reflections = getReflections();
    const todayStr    = new Date().toISOString().split("T")[0];
    const idx         = reflections.findIndex(r => r.date === todayStr);

    const entry = {
        date:      todayStr,
        text:      text,
        mood:      selectedMood,
        habitsLog: habits.map(h => ({
            name:      h.name,
            completed: h.completedDates.includes(todayStr)
        }))
    };

    if(idx >= 0) reflections[idx] = entry;
    else         reflections.unshift(entry);

    localStorage.setItem(reflectionKey, JSON.stringify(reflections));

    document.getElementById("reflectionText").value = "";
    // Reset mood to default
    document.querySelectorAll(".mood-pick").forEach(m => m.style.opacity = "0.4");
    const defaultMood = document.querySelector('.mood-pick[data-mood="great"]');
    if(defaultMood) defaultMood.style.opacity = "1";
    selectedMood = "great";

    renderReflections();
}

function getReflections() {
    return JSON.parse(localStorage.getItem(reflectionKey)) || [];
}

const moodMap = {
    great:  "😊 Great",
    okay:   "😐 Okay",
    low:    "😔 Low",
    stress: "😤 Stressed"
};

function renderReflections() {
    const list = document.getElementById("reflectionList");
    if(!list) return;

    const reflections = getReflections();
    if(reflections.length === 0) {
        list.innerHTML = `<p class="empty-text">No reflections yet — write your first one above.</p>`;
        return;
    }

    list.innerHTML = "";
    reflections.forEach(entry => {
        const card = document.createElement("div");
        card.className = "reflection-card";

        const dateLabel = new Date(entry.date + "T00:00:00")
            .toLocaleDateString("en-GB", {
                weekday:"long", day:"2-digit", month:"long", year:"numeric"
            });

        const habitChips = (entry.habitsLog||[]).map(h =>
            `<div class="mood-chip">${h.name} ${h.completed?"✅":"❌"}</div>`
        ).join("");

        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div class="reflection-date">${dateLabel}</div>
                <button class="danger-btn" style="padding:3px 10px;font-size:11px;"
                    data-date="${entry.date}">Delete</button>
            </div>
            <div class="reflection-text">${entry.text}</div>
            <div class="mood-row">
                <div class="mood-chip">${moodMap[entry.mood] || entry.mood}</div>
                ${habitChips}
            </div>`;

        card.querySelector(".danger-btn").addEventListener("click", () => {
            if(!confirm("Delete this reflection?")) return;
            const updated = getReflections().filter(r => r.date !== entry.date);
            localStorage.setItem(reflectionKey, JSON.stringify(updated));
            renderReflections();
        });

        list.appendChild(card);
    });
}