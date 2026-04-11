// FILE: tailwind.config.js
// PURPOSE: Tailwind CSS configuration — registers the dark theme color palette and custom fonts
// USED BY: PostCSS pipeline when processing CSS files

/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind which files to scan so it can tree-shake unused styles
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      // ── Custom color palette (dark GitHub-style theme) ──────────────
      colors: {
        bg:     '#0d1117',   // page background
        card:   '#161b22',   // card / panel background
        border: '#30363d',   // border color

        accent: {
          green:  '#238636', // score >= 80, success
          red:    '#da3633', // score < 50, CRITICAL
          yellow: '#d29922', // score 50-79, MEDIUM
          blue:   '#388bfd', // LOW / info
          orange: '#e3702a', // HIGH severity
        },

        text: {
          primary: '#e6edf3', // main body text
          muted:   '#8b949e', // secondary / placeholder text
        },
      },

      // ── Custom fonts ─────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      // ── Animation ────────────────────────────────────────────────────
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },

  plugins: [],
}
