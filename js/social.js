/**
 * PPS - Social Module
 * Manages social tabs, leaderboards, and challenges.
 */

import { getState } from './state.js';

export function renderSocial() {
    renderLeaderboard();
}

window.switchSocialTab = function(tabID) {
    const contents = document.querySelectorAll('.social-content');
    const tabs = document.querySelectorAll('#socialSection .auth-tab');

    contents.forEach(content => {
        content.style.display = 'none';
    });
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    const selectedContent = document.getElementById(`social${tabID.charAt(0).toUpperCase() + tabID.slice(1)}`);
    if (selectedContent) selectedContent.style.display = 'block';

    const selectedTab = document.getElementById(`tab${tabID.charAt(0).toUpperCase() + tabID.slice(1)}`);
    if (selectedTab) selectedTab.classList.add('active');
};

function renderLeaderboard() {
    const list = document.getElementById('leaderboardList');
    if (!list) return;

    const state = getState();
    const currentUserEmail = state.storageKey.includes('guest')
        ? 'Guest'
        : (JSON.parse(localStorage.getItem('pps_currentUser'))?.email || 'User');

    const mockUsers = [
        { name: 'Elite Achiever', level: 14, streak: 42, xp: 1420 },
        { name: 'Habit Hero', level: 9, streak: 15, xp: 950 },
        { name: 'Consistent Chris', level: 4, streak: 12, xp: 480 }
    ];

    const userRank = {
        name: `You (${currentUserEmail})`,
        level: state.stats.level,
        streak: state.stats.streak,
        xp: state.stats.totalXP,
        isMe: true
    };

    const allUsers = [...mockUsers, userRank].sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        if (b.xp !== a.xp) return b.xp - a.xp;
        return b.streak - a.streak;
    });

    list.innerHTML = allUsers.map((user, index) => `
        <div class="task-item" style="padding: 14px; border: 1px solid ${user.isMe ? 'var(--accent)' : 'var(--border)'}; background: ${user.isMe ? 'var(--accent-dim)' : 'var(--surface)'};">
            <div style="display:flex; align-items:center; gap:16px; flex:1;">
                <div style="font-weight: 800; color: var(--muted); width: 24px; font-size: 14px;">
                    ${index + 1}
                </div>
                <div class="avatar" style="width: 32px; height: 32px; font-size: 10px; background: ${user.isMe ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : '#333'};">
                    ${user.name.charAt(0)}
                </div>
                <div>
                    <div style="font-weight: 700; font-size: 14px; color: ${user.isMe ? 'var(--text)' : 'var(--text-2)'};">
                        ${user.name}
                    </div>
                    <div class="text-muted" style="font-size: 11px;">
                        Level ${user.level} • ${user.xp} XP
                    </div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 700; color: var(--orange); font-size: 14px;">
                    🔥 ${user.streak}
                </div>
                <div class="text-muted" style="font-size: 10px; text-transform: uppercase;">
                    Streak
                </div>
            </div>
        </div>
    `).join('');
}
