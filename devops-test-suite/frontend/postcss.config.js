// FILE: postcss.config.js
// PURPOSE: Tells Vite/PostCSS to run Tailwind CSS and autoprefixer on every CSS file
// USED BY: Vite build pipeline when processing src/index.css

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
