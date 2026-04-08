/**
 * tasks.js
 * Local task planner plus calendar-connection placeholder UI.
 * Google/Outlook sync is intentionally marked "coming soon".
 */

import { getData, saveData } from './storageService.js';

let activeUser = null;
let tasksBound = false;

function getUserKey() {
    return activeUser?.email || 'guest';
}

function getTasksStorageKey() {
    return `pps_tasks_${getUserKey()}`;
}

function getConnectionStorageKey() {
    return `pps_calendar_connection_${getUserKey()}`;
}

function getTasksList() {
    return getData(getTasksStorageKey(), []);
}

function saveTasksList(list) {
    saveData(getTasksStorageKey(), list);
}

function getConnectionRequest() {
    return getData(getConnectionStorageKey(), null);
}

function saveConnectionRequest(connection) {
    saveData(getConnectionStorageKey(), connection);
}

function emitTasksUpdated() {
    document.dispatchEvent(new CustomEvent('tasksUpdated'));
}

function formatTaskDate(dateStr) {
    if (!dateStr) return 'No due date';
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function openTasksSection() {
    document.querySelector('.nav-item[data-section="tasksSection"]')?.click();
}

function showTasksMessage(text, type = 'error') {
    const el = document.getElementById('tasksMsg');
    if (!el) return;
    el.textContent = text;
    el.className = `msg ${type}`;
    el.style.display = 'block';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
        el.style.display = 'none';
    }, 3200);
}

function updateTaskSummary(tasks, connection) {
    const pending = tasks.filter(task => !task.done).length;
    const completed = tasks.length - pending;

    const totalEl = document.getElementById('tasksTotalCount');
    if (totalEl) totalEl.textContent = String(tasks.length);

    const pendingEl = document.getElementById('tasksPendingCount');
    if (pendingEl) pendingEl.textContent = String(pending);

    const completedEl = document.getElementById('tasksCompletedCount');
    if (completedEl) completedEl.textContent = String(completed);

    const syncStateEl = document.getElementById('tasksCalendarState');
    if (syncStateEl) syncStateEl.textContent = connection ? `${connection.provider} requested` : 'Not connected';

    const emailInput = document.getElementById('taskConnectionEmail');
    if (emailInput) emailInput.value = connection?.email || '';

    const providerEl = document.getElementById('taskConnectionProvider');
    if (providerEl) providerEl.textContent = connection ? connection.provider : 'Choose a calendar';

    const hintEl = document.getElementById('taskConnectionHint');
    if (hintEl) {
        hintEl.textContent = connection
            ? `We will use ${connection.email} automatically when ${connection.provider} sync goes live.`
            : 'Click connect and PPS will pull your sign-up email automatically.';
    }

    const dashboardCountEl = document.getElementById('dashboardTaskCount');
    if (dashboardCountEl) dashboardCountEl.textContent = `${pending} pending`;

    const dashboardStatusEl = document.getElementById('dashboardTaskStatus');
    if (dashboardStatusEl) {
        dashboardStatusEl.textContent = connection
            ? `${connection.provider} sync is queued for ${connection.email}.`
            : (tasks.length ? `You have ${tasks.length} saved task${tasks.length === 1 ? '' : 's'} ready to organize.` : 'Plan tasks now and connect your calendar when the sync launches.');
    }
}

function renderTaskList(tasks) {
    const list = document.getElementById('taskList');
    if (!list) return;

    if (!tasks.length) {
        list.innerHTML = `
            <div class="tasks-empty">
                <div class="tasks-empty-icon">T</div>
                <div class="tasks-empty-title">No tasks yet</div>
                <div class="tasks-empty-copy">Create your first task here. Calendar sync and email reminders will attach to this workflow once the connection ships.</div>
            </div>
        `;
        return;
    }

    const sorted = [...tasks].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
    });

    list.innerHTML = sorted.map(task => `
        <article class="task-planner-item ${task.done ? 'is-done' : ''}">
            <div class="task-planner-main">
                <label class="task-planner-check">
                    <input type="checkbox" data-task-toggle="${task.id}" ${task.done ? 'checked' : ''}>
                    <span></span>
                </label>
                <div class="task-planner-copy">
                    <div class="task-planner-title">${task.title}</div>
                    <div class="task-planner-meta">
                        <span>${formatTaskDate(task.dueDate)}</span>
                        ${task.emailReminder ? '<span>Email when sync is live</span>' : '<span>In dashboard</span>'}
                    </div>
                    ${task.note ? `<p class="task-planner-note">${task.note}</p>` : ''}
                </div>
            </div>
            <button class="ghost-btn task-planner-delete" type="button" data-task-delete="${task.id}">Delete</button>
        </article>
    `).join('');
}

function handleConnect(provider) {
    if (!activeUser?.email) {
        showTasksMessage('Sign in with an account email to connect calendar sync when it launches.');
        return;
    }

    const connection = {
        provider,
        email: activeUser.email,
        requestedAt: new Date().toISOString(),
        status: 'coming_soon'
    };

    saveConnectionRequest(connection);
    renderTasks();
    showTasksMessage(`${provider} sync is coming soon. We will use ${activeUser.email} automatically.`, 'success');
}

function handleSaveTask() {
    const titleInput = document.getElementById('taskTitle');
    const dateInput = document.getElementById('taskDueDate');
    const noteInput = document.getElementById('taskNote');
    const emailCheckbox = document.getElementById('taskEmailReminder');

    const title = titleInput?.value.trim() || '';
    const dueDate = dateInput?.value || '';
    const note = noteInput?.value.trim() || '';
    const emailReminder = Boolean(emailCheckbox?.checked);

    if (!title) {
        showTasksMessage('Task title is required.');
        return;
    }
    if (!dueDate) {
        showTasksMessage('Choose a due date for the task.');
        return;
    }

    const tasks = getTasksList();
    tasks.push({
        id: Date.now(),
        title,
        dueDate,
        note,
        emailReminder,
        done: false,
        createdAt: new Date().toISOString()
    });

    saveTasksList(tasks);
    if (titleInput) titleInput.value = '';
    if (dateInput) dateInput.value = '';
    if (noteInput) noteInput.value = '';
    if (emailCheckbox) emailCheckbox.checked = true;

    renderTasks();
    emitTasksUpdated();
    showTasksMessage('Task saved.', 'success');
}

function bindTaskActions() {
    const list = document.getElementById('taskList');
    if (!list || list.dataset.bound === 'true') return;
    list.dataset.bound = 'true';

    list.addEventListener('change', event => {
        const checkbox = event.target.closest('[data-task-toggle]');
        if (!checkbox) return;
        const id = Number(checkbox.dataset.taskToggle);
        const tasks = getTasksList();
        const task = tasks.find(item => item.id === id);
        if (!task) return;
        task.done = checkbox.checked;
        saveTasksList(tasks);
        renderTasks();
        emitTasksUpdated();
    });

    list.addEventListener('click', event => {
        const button = event.target.closest('[data-task-delete]');
        if (!button) return;
        const id = Number(button.dataset.taskDelete);
        const tasks = getTasksList().filter(item => item.id !== id);
        saveTasksList(tasks);
        renderTasks();
        emitTasksUpdated();
        showTasksMessage('Task deleted.', 'success');
    });
}

function bindTasksUI() {
    if (tasksBound) return;
    tasksBound = true;

    document.getElementById('saveTaskBtn')?.addEventListener('click', handleSaveTask);
    document.getElementById('taskConnectGoogleBtn')?.addEventListener('click', () => handleConnect('Google Calendar'));
    document.getElementById('taskConnectOutlookBtn')?.addEventListener('click', () => handleConnect('Outlook Calendar'));
    document.getElementById('openTasksSectionBtn')?.addEventListener('click', openTasksSection);
    bindTaskActions();
}

export function initTasks(user) {
    activeUser = user;
    bindTasksUI();
    renderTasks();
}

export function renderTasks() {
    if (!activeUser) {
        activeUser = getData('currentUser', { email: null, name: 'Guest' });
    }

    const tasks = getTasksList();
    const connection = getConnectionRequest();
    updateTaskSummary(tasks, connection);
    renderTaskList(tasks);
}
