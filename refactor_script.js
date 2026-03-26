const fs = require('fs');

// dashboard.js
let code = fs.readFileSync('js/dashboard.js', 'utf8');
code = code.replace(/import \{ habits, isHabitDueToday/g, 'import { isHabitDueToday');
code = code.replace("import { CONFIG } from './config.js';", "import { CONFIG } from './config.js';\nimport { getState } from './state.js';");

const funcs = [
    'renderDashboard', 'updateCompletionStats', 'updateProgressWidget', 
    'updateWeeklyChart', 'renderDailyTracker', 'renderStreakSection', 
    'updateLevelWidget', 'renderHabitSuccessRates', '_renderHeatmapDates'
];

funcs.forEach(f => {
    const regex = new RegExp(`function ${f}\\s*\\([^)]*\\)\\s*\\{`);
    code = code.replace(regex, match => `${match}\n    const { habits } = getState();`);
});

code = code.replace(/function setupSettings\(user\)\s*\{/, "function setupSettings(user) {\n    const { habits } = getState();");
fs.writeFileSync('js/dashboard.js', code);

// reflection.js
let rfl = fs.readFileSync('js/reflection.js', 'utf8');
rfl = rfl.replace("import { habits } from './habits.js';", "import { getState } from './state.js';");
rfl = rfl.replace('if (typeof habits !== "undefined") {', 'const { habits } = getState();\n        if (typeof habits !== "undefined") {');
fs.writeFileSync('js/reflection.js', rfl);

console.log("Refactoring complete");
