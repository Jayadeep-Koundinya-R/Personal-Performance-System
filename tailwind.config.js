/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // support switching themes
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        card: 'var(--card)',
        'card-hover': 'var(--card-hover)',
        border: 'var(--border)',
        'border-bright': 'var(--border-bright)',
        accent: 'var(--accent)',
        accent2: 'var(--accent2)',
        amber: 'var(--amber)',
        green: 'var(--green)',
        red: 'var(--red)',
        orange: 'var(--orange)',
        yellow: 'var(--yellow)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        muted: 'var(--muted)',
      },
      borderRadius: {
        radius: 'var(--radius)',
        'radius-sm': 'var(--radius-sm)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'JetBrains Mono', 'monospace'],
        syne: ['Syne', 'monospace'],
      },
      boxShadow: {
        'glow-accent': 'var(--glow-accent)',
        'glow-amber': 'var(--glow-amber)',
        'glow-cyan': 'var(--glow-cyan)',
        'glow-green': 'var(--glow-green)',
        'soft-shadow': 'var(--soft-shadow)',
        'card-shadow': 'var(--card-shadow)',
      },
    },
  },
  plugins: [],
}
