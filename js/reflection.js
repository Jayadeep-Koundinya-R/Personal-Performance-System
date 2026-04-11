import { getState } from './state.js';
import { getData, saveData } from './storageService.js';
import { getTodayStr } from './utils.js';

/* ── Helpers ── */
function _getUser() { return getData('currentUser', {}); }
function _rflKey()  { return 'reflections_' + (_getUser().email || 'guest'); }

function _showStatus(msg, ok) {
    const el = document.getElementById('rfl_status');
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? '#22c55e' : '#ef4444';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, 3000);
}

/* ── State ── */
let rfl_mood    = 'great';
let rfl_habitId = null;   // null = "General / All habits"

/* ── Mood ── */
export function rfl_setMood(el, mood) {
    rfl_mood = mood;
    document.querySelectorAll('.rfl-mood-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
}

/* ── Habit selector ── */
export function rfl_renderHabitSelector() {
    const wrap = document.getElementById('rfl_habit_selector');
    if (!wrap) return;

    const { habits } = getState();
    const todayStr   = getTodayStr();

    // Build pill list: "General" first, then each habit
    const pills = [{ id: null, name: '🌐 General', category: '', dueToday: false }];
    habits.forEach(h => {
        const dueToday = (h.completedDates || []).includes(todayStr) ||
            (h.dueDate && h.dueDate.slice(0, 10) === todayStr);
        pills.push({ id: h.id, name: h.name, category: h.category || '', dueToday });
    });

    wrap.innerHTML = pills.map(p => {
        const isActive  = p.id === rfl_habitId;
        const doneChip  = p.dueToday
            ? `<span class="rfl-habit-pill-done">✓</span>`
            : '';
        return `
            <button
                class="rfl-habit-pill ${isActive ? 'active' : ''}"
                data-habit-id="${p.id ?? ''}"
                onclick="rfl_selectHabit(this)"
                title="${p.category ? p.category : 'General'}"
            >
                ${p.name}${doneChip}
            </button>`;
    }).join('');
}

window.rfl_selectHabit = function(el) {
    const raw = el.dataset.habitId;
    rfl_habitId = raw === '' ? null : Number(raw);
    document.querySelectorAll('.rfl-habit-pill').forEach(b => b.classList.remove('active'));
    el.classList.add('active');

    // Update textarea placeholder based on selection
    const ta = document.getElementById('rfl_text');
    if (!ta) return;
    if (rfl_habitId === null) {
        ta.placeholder = 'What went well today? Any wins worth celebrating?';
    } else {
        const { habits } = getState();
        const h = habits.find(x => x.id === rfl_habitId);
        ta.placeholder = h
            ? `How did "${h.name}" go today? What helped or held you back?`
            : 'What went well? What would you do differently?';
    }
};

/* ── Save ── */
export function rfl_save() {
    const ta   = document.getElementById('rfl_text');
    const text = ta ? ta.value.trim() : '';
    if (!text) { _showStatus('Write something first.', false); return; }

    const key  = _rflKey();
    const list = getData(key, []);
    const today = getTodayStr();

    // Snapshot habit completions
    const habLog = [];
    try {
        const { habits } = getState();
        habits.forEach(h => {
            habLog.push({ id: h.id, name: h.name, completed: (h.completedDates || []).includes(today) });
        });
    } catch (_) {}

    // Find linked habit name for display
    let linkedHabitName = null;
    if (rfl_habitId !== null) {
        const { habits } = getState();
        const h = habits.find(x => x.id === rfl_habitId);
        if (h) linkedHabitName = h.name;
    }

    const entry = {
        date: today,
        text,
        mood: rfl_mood || 'great',
        habitId: rfl_habitId,
        habitName: linkedHabitName,
        habitsLog: habLog
    };

    // One entry per (date + habitId) combo — update if exists, else prepend
    const existIdx = list.findIndex(r => r.date === today && (r.habitId ?? null) === (rfl_habitId ?? null));
    if (existIdx >= 0) list[existIdx] = entry;
    else               list.unshift(entry);

    saveData(key, list);

    // Reset form
    if (ta) ta.value = '';
    rfl_mood    = 'great';
    rfl_habitId = null;
    document.querySelectorAll('.rfl-mood-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mood === 'great');
    });
    rfl_renderHabitSelector();

    _showStatus('Saved ✓', true);
    rfl_render();
}

/* ── Render past entries ── */
export function rfl_render() {
    const container = document.getElementById('rfl_list');
    if (!container) return;

    const list = getData(_rflKey(), []);

    if (list.length === 0) {
        container.innerHTML = `
            <div class="rfl-empty">
                <div class="rfl-empty-icon">📝</div>
                <div class="rfl-empty-title">No reflections yet</div>
                <div class="rfl-empty-sub">Write your first entry above to start building self-awareness alongside your habits.</div>
            </div>`;
        return;
    }

    const moodMeta = {
        great:  { label: 'Great',    emoji: '😊', color: '#22d47a', bg: 'rgba(34,212,122,0.08)',  border: 'rgba(34,212,122,0.25)' },
        okay:   { label: 'Okay',     emoji: '😐', color: '#f5a623', bg: 'rgba(245,166,35,0.08)',  border: 'rgba(245,166,35,0.25)' },
        low:    { label: 'Low',      emoji: '😔', color: '#6ea8ff', bg: 'rgba(110,168,255,0.08)', border: 'rgba(110,168,255,0.25)' },
        stress: { label: 'Stressed', emoji: '😤', color: '#ff4d6a', bg: 'rgba(255,77,106,0.08)',  border: 'rgba(255,77,106,0.25)' }
    };

    // Group entries by date for display
    const byDate = {};
    list.forEach(entry => {
        if (!byDate[entry.date]) byDate[entry.date] = [];
        byDate[entry.date].push(entry);
    });

    let html = '';
    Object.keys(byDate).sort().reverse().forEach(date => {
        const entries = byDate[date];
        const d    = new Date(date + 'T12:00:00');
        const dstr = d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

        // Date group header
        html += `<div class="rfl-date-group-header">${dstr}</div>`;

        entries.forEach(entry => {
            const m = moodMeta[entry.mood] || moodMeta.great;

            // Habit tag
            const habitTag = entry.habitName
                ? `<span class="rfl-entry-habit-tag">📌 ${entry.habitName}</span>`
                : `<span class="rfl-entry-habit-tag rfl-entry-habit-general">🌐 General</span>`;

            // Habit completion bar
            const done  = (entry.habitsLog || []).filter(h => h.completed).length;
            const total = (entry.habitsLog || []).length;
            const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
            const habitBar = total > 0 ? `
                <div class="rfl-habit-bar-wrap">
                    <div class="rfl-habit-bar-label">
                        <span>${done}/${total} habits completed that day</span>
                        <span style="color:${m.color};">${pct}%</span>
                    </div>
                    <div class="rfl-habit-bar-track">
                        <div class="rfl-habit-bar-fill" style="width:${pct}%;background:${m.color};"></div>
                    </div>
                </div>` : '';

            html += `
                <div class="rfl-entry-card" style="border-left-color:${m.color};background:${m.bg};border-color:${m.border};">
                    <div class="rfl-entry-head">
                        <div class="rfl-entry-meta">
                            <span class="rfl-entry-mood-badge" style="background:${m.bg};color:${m.color};border-color:${m.border};">
                                ${m.emoji} ${m.label}
                            </span>
                            ${habitTag}
                        </div>
                        <button class="rfl-delete-btn"
                            data-date="${entry.date}"
                            data-habit-id="${entry.habitId ?? ''}"
                            onclick="rfl_delete(this.dataset.date, this.dataset.habitId)"
                            aria-label="Delete reflection">✕</button>
                    </div>
                    <div class="rfl-entry-text">${entry.text}</div>
                    ${habitBar}
                </div>`;
        });
    });

    container.innerHTML = html;
}

/* ── Delete ── */
export function rfl_delete(date, habitIdRaw) {
    if (!confirm('Delete this reflection?')) return;
    const habitId = habitIdRaw === '' ? null : Number(habitIdRaw);
    const key  = _rflKey();
    const list = getData(key, []).filter(r =>
        !(r.date === date && (r.habitId ?? null) === habitId)
    );
    saveData(key, list);
    rfl_render();
}

/* ── Setup ── */
export function setupReflections() {
    rfl_renderHabitSelector();
    rfl_render();
}
