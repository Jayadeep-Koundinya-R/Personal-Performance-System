/**
 * PPS - Theme Service
 * Handles Dark/Light mode switching and persistence
 */

export function initTheme() {
    const savedTheme = localStorage.getItem('pps_theme') || 'dark';
    applyTheme(savedTheme);
    updateToggleUI(savedTheme);
}

export function bindThemeToggles() {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
        if (btn.dataset.themeBound === 'true') return;
        btn.dataset.themeBound = 'true';
        btn.addEventListener('click', toggleTheme);
    });
}

export function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    applyTheme(newTheme);
    localStorage.setItem('pps_theme', newTheme);
    updateToggleUI(newTheme);

    return newTheme;
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function updateToggleUI(theme) {
    const modeName = theme === 'light' ? 'Light' : 'Dark';
    const nextTitle = theme === 'light' ? 'Switch to Dark' : 'Switch to Light';

    document.querySelectorAll('[data-theme-name]').forEach(el => {
        el.textContent = modeName;
    });

    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
        btn.title = nextTitle;
        btn.setAttribute('aria-label', nextTitle);
    });
}
