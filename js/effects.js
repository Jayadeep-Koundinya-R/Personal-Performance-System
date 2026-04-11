/**
 * effects.js
 * All micro-interaction effects — XP pops, celebrations, toasts, nudges.
 * Import and call these from habits.js, achievements.js, etc.
 * Never imports from other app modules to avoid circular deps.
 */

/* ─────────────────────────────────────
   CONFETTI ENGINE (no library needed)
───────────────────────────────────── */
function _spawnConfetti(count = 60, origin = null) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
        position:fixed;inset:0;width:100%;height:100%;
        pointer-events:none;z-index:99999;
    `;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#6ea8ff','#3dd9c2','#f5a623','#22d47a','#ff4d6a','#f5c518','#a78bfa'];
    const particles = Array.from({ length: count }, () => {
        const ox = origin ? origin.x : canvas.width / 2;
        const oy = origin ? origin.y : canvas.height * 0.4;
        return {
            x: ox, y: oy,
            vx: (Math.random() - 0.5) * 14,
            vy: (Math.random() - 0.8) * 16,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 7 + 4,
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 8,
            gravity: 0.45,
            alpha: 1
        };
    });

    let frame;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.98;
            p.rotation += p.rotSpeed;
            p.alpha -= 0.012;
            if (p.alpha > 0) {
                alive = true;
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            }
        });
        if (alive) frame = requestAnimationFrame(draw);
        else canvas.remove();
    }
    draw();
    setTimeout(() => { cancelAnimationFrame(frame); canvas.remove(); }, 4000);
}

/* ─────────────────────────────────────
   XP POP — floats "+10 XP" from element
───────────────────────────────────── */
export function showXpPop(anchorEl, amount = 10) {
    const pop = document.createElement('div');
    pop.textContent = `+${amount} XP`;
    pop.style.cssText = `
        position:fixed;
        font-family:'Space Grotesk',sans-serif;
        font-size:15px;font-weight:800;
        color:#22d47a;
        text-shadow:0 0 12px rgba(34,212,122,0.6);
        pointer-events:none;z-index:99998;
        animation:xpPopAnim 1.1s cubic-bezier(.22,1,.36,1) forwards;
    `;

    // Position near the anchor element
    if (anchorEl) {
        const r = anchorEl.getBoundingClientRect();
        pop.style.left = `${r.right + 8}px`;
        pop.style.top  = `${r.top + r.height / 2 - 10}px`;
    } else {
        pop.style.left = '50%';
        pop.style.top  = '40%';
        pop.style.transform = 'translateX(-50%)';
    }

    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 1200);
}

/* ─────────────────────────────────────
   STREAK MILESTONE TOAST
───────────────────────────────────── */
const STREAK_MILESTONES = new Set([3, 7, 14, 21, 30, 50, 100]);

export function checkStreakMilestone(streak) {
    if (!STREAK_MILESTONES.has(streak)) return;
    const msgs = {
        3:   ['🔥 3-Day Streak!', "You're building momentum. Keep it up!"],
        7:   ['⚡ One Week Streak!', "A full week of consistency. You're on fire!"],
        14:  ['💪 Two Weeks Strong!', "Two weeks in. This is becoming a real habit."],
        21:  ['🧠 21 Days!', "Science says habits form at 21 days. You did it."],
        30:  ['🏆 30-Day Streak!', "A whole month. You're in the top tier now."],
        50:  ['👑 50-Day Legend!', "Fifty days of showing up. Absolutely elite."],
        100: ['🌟 100 Days!', "One hundred days. You are unstoppable."]
    };
    const [title, sub] = msgs[streak] || [`🔥 ${streak}-Day Streak!`, 'Keep going!'];
    _showToast(title, sub, 'streak', 4000);
}

/* ─────────────────────────────────────
   BADGE UNLOCK TOAST
───────────────────────────────────── */
export function showBadgeUnlockToast(badge) {
    _showToast(
        `${badge.icon} Badge Unlocked!`,
        badge.name,
        'badge',
        4000
    );
}

/* ─────────────────────────────────────
   GENERIC TOAST ENGINE
───────────────────────────────────── */
let _toastQueue = [];
let _toastActive = false;

function _showToast(title, subtitle, type = 'default', duration = 3500) {
    _toastQueue.push({ title, subtitle, type, duration });
    if (!_toastActive) _nextToast();
}

function _nextToast() {
    if (!_toastQueue.length) { _toastActive = false; return; }
    _toastActive = true;
    const { title, subtitle, type, duration } = _toastQueue.shift();

    const colors = {
        streak: { bg: 'var(--toast-streak-bg, linear-gradient(135deg,#1a0c00,#2a1400))', border: '#f5a623', glow: 'rgba(245,166,35,0.3)' },
        badge:  { bg: 'var(--toast-badge-bg,  linear-gradient(135deg,#0c0818,#1a1040))', border: '#6ea8ff', glow: 'rgba(110,168,255,0.3)' },
        perfect:{ bg: 'var(--toast-perfect-bg,linear-gradient(135deg,#001610,#002820))', border: '#22d47a', glow: 'rgba(34,212,122,0.3)' },
        default:{ bg: 'var(--card)',                                                       border: 'var(--border-bright)', glow: 'transparent' }
    };
    const c = colors[type] || colors.default;

    const toast = document.createElement('div');
    toast.style.cssText = `
        position:fixed;top:24px;right:24px;z-index:99997;
        background:${c.bg};
        border:1px solid ${c.border};
        border-radius:16px;padding:16px 20px;
        min-width:260px;max-width:320px;
        box-shadow:0 8px 32px ${c.glow}, 0 2px 8px rgba(0,0,0,0.4);
        display:flex;align-items:flex-start;gap:12px;
        animation:toastSlideIn .35s cubic-bezier(.22,1,.36,1) forwards;
        font-family:'Space Grotesk',sans-serif;
    `;
    toast.innerHTML = `
        <div style="flex:1;">
            <div style="font-weight:700;font-size:14px;color:#fff;margin-bottom:3px;">${title}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.6);">${subtitle}</div>
        </div>
        <button style="background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:16px;padding:0;line-height:1;" onclick="this.parentElement.remove()">✕</button>
    `;
    document.body.appendChild(toast);

    const timer = setTimeout(() => {
        toast.style.animation = 'toastSlideOut .3s ease forwards';
        setTimeout(() => { toast.remove(); _nextToast(); }, 320);
    }, duration);

    toast.querySelector('button').addEventListener('click', () => {
        clearTimeout(timer);
        toast.remove();
        _nextToast();
    });
}

/* ─────────────────────────────────────
   PERFECT DAY MODAL
───────────────────────────────────── */
export function showPerfectDayModal(streak) {
    // Don't show if already shown today
    const todayKey = `pps_perfect_shown_${new Date().toISOString().slice(0,10)}`;
    if (sessionStorage.getItem(todayKey)) return;
    sessionStorage.setItem(todayKey, '1');

    _spawnConfetti(80);

    const overlay = document.createElement('div');
    overlay.id = '_pps_perfect_overlay';
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:99996;
        background:rgba(0,0,0,0.75);
        backdrop-filter:blur(6px);
        display:flex;align-items:center;justify-content:center;
        animation:fadeIn .3s ease;
    `;

    overlay.innerHTML = `
        <div style="
            background:linear-gradient(145deg,#0a1628,#0f1e38);
            border:1px solid #22d47a44;
            border-radius:28px;padding:44px 40px;
            text-align:center;max-width:420px;width:90%;
            box-shadow:0 0 60px rgba(34,212,122,0.15),0 32px 80px rgba(0,0,0,0.5);
            animation:modalIn .4s cubic-bezier(.34,1.56,.64,1);
            font-family:'Space Grotesk',sans-serif;
        ">
            <div style="font-size:56px;margin-bottom:12px;animation:bounceIn .6s .1s both;">⭐</div>
            <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#22d47a;font-family:'DM Mono',monospace;margin-bottom:10px;">Perfect Day</div>
            <h2 style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.04em;margin-bottom:8px;">All habits done!</h2>
            <p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin-bottom:8px;">
                You completed every habit today.<br>
                ${streak > 1 ? `<strong style="color:#f5a623;">🔥 ${streak}-day streak</strong> and counting.` : 'Your streak has started!'}
            </p>
            <p style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:28px;">
                Want to capture how today felt?
            </p>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                <button id="_pps_reflect_yes" style="
                    background:linear-gradient(135deg,#22d47a,#16a34a);
                    color:#fff;border:none;border-radius:12px;
                    padding:12px 28px;font-size:14px;font-weight:700;
                    cursor:pointer;font-family:'Space Grotesk',sans-serif;
                    box-shadow:0 4px 16px rgba(34,212,122,0.35);
                    transition:transform .15s;
                ">✍️ Write reflection</button>
                <button id="_pps_reflect_no" style="
                    background:transparent;
                    color:rgba(255,255,255,0.5);
                    border:1px solid rgba(255,255,255,0.15);
                    border-radius:12px;padding:12px 24px;
                    font-size:14px;cursor:pointer;
                    font-family:'Space Grotesk',sans-serif;
                    transition:border-color .15s,color .15s;
                ">Maybe later</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#_pps_reflect_yes').addEventListener('click', () => {
        overlay.remove();
        // Navigate to reflections section
        document.querySelector('.nav-item[data-section="reflectionSection"]')?.click();
        // Focus the textarea after a short delay
        setTimeout(() => {
            const ta = document.getElementById('rfl_text');
            if (ta) { ta.focus(); ta.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        }, 400);
    });

    overlay.querySelector('#_pps_reflect_no').addEventListener('click', () => {
        overlay.style.animation = 'fadeOut .25s ease forwards';
        setTimeout(() => overlay.remove(), 260);
    });

    overlay.addEventListener('click', e => {
        if (e.target === overlay) {
            overlay.style.animation = 'fadeOut .25s ease forwards';
            setTimeout(() => overlay.remove(), 260);
        }
    });
}

/* ─────────────────────────────────────
   REFLECTION NUDGE (gentle, non-blocking)
   Shows after a habit is completed if no
   reflection exists for today yet.
───────────────────────────────────── */
export function showReflectionNudge() {
    // Only show once per session
    if (sessionStorage.getItem('pps_nudge_shown')) return;
    sessionStorage.setItem('pps_nudge_shown', '1');

    setTimeout(() => {
        _showToast('📝 How\'s your day going?', 'Add a quick reflection while it\'s fresh.', 'default', 5000);
    }, 2000);
}

/* ─────────────────────────────────────
   INJECT KEYFRAMES (once)
───────────────────────────────────── */
(function injectKeyframes() {
    if (document.getElementById('_pps_effect_styles')) return;
    const style = document.createElement('style');
    style.id = '_pps_effect_styles';
    style.textContent = `
        @keyframes xpPopAnim {
            0%   { opacity:0; transform:translateY(0) scale(0.7); }
            20%  { opacity:1; transform:translateY(-8px) scale(1.1); }
            80%  { opacity:1; transform:translateY(-28px) scale(1); }
            100% { opacity:0; transform:translateY(-44px) scale(0.9); }
        }
        @keyframes toastSlideIn {
            from { opacity:0; transform:translateX(40px) scale(0.95); }
            to   { opacity:1; transform:translateX(0) scale(1); }
        }
        @keyframes toastSlideOut {
            from { opacity:1; transform:translateX(0); }
            to   { opacity:0; transform:translateX(40px); }
        }
        @keyframes bounceIn {
            0%   { transform:scale(0.3); opacity:0; }
            50%  { transform:scale(1.15); opacity:1; }
            70%  { transform:scale(0.9); }
            100% { transform:scale(1); }
        }
        @keyframes fadeOut {
            from { opacity:1; }
            to   { opacity:0; }
        }
        @keyframes shimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
        }
        @keyframes flamePulse {
            0%,100% { text-shadow: 0 0 20px rgba(245,166,35,0.6), 0 0 40px rgba(245,166,35,0.3); transform:scale(1); }
            50%      { text-shadow: 0 0 30px rgba(245,166,35,0.9), 0 0 60px rgba(245,166,35,0.5); transform:scale(1.05); }
        }
        @keyframes streakGlow {
            0%,100% { box-shadow: 0 0 0 0 rgba(245,166,35,0); }
            50%      { box-shadow: 0 0 20px 4px rgba(245,166,35,0.25); }
        }
        @keyframes badgeShine {
            0%   { background-position:-200% center; }
            100% { background-position:200% center; }
        }
        @keyframes rowComplete {
            0%   { background:transparent; }
            30%  { background:rgba(34,212,122,0.12); }
            100% { background:transparent; }
        }
        @keyframes checkPop {
            0%   { transform:scale(1); }
            40%  { transform:scale(1.3); }
            100% { transform:scale(1); }
        }
    `;
    document.head.appendChild(style);
})();
