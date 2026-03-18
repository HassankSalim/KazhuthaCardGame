/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'cream': {
          DEFAULT: '#e8e4dc',
          card: '#f5f2eb',
        },
        'felt': {
          DEFAULT: '#1a2e1a',
          light: '#243824',
          highlight: '#2d4a2d',
        },
        'brand': {
          primary: '#065f46',
          'primary-hover': '#064e3b',
          dark: '#0a261a',
          gold: '#d4af37',
          'gold-shadow': '#b8902d',
        },
        'felt-light': '#c5d5c5',
        'felt-muted': '#a3bca3',
        'felt-dim': '#90a690',
        'gold': {
          DEFAULT: '#d4af37',
          dim: '#b8902d',
        },
        'teal': {
          DEFAULT: '#10b981',
        },
        'surface': {
          base: '#1a2e1a',
          card: '#243d24',
          raised: '#2d4a2d',
          active: '#3d5a3d',
          deep: '#1e3220',
          border: '#4a6b4a',
        },
        'suit': {
          red: '#c0392b',
          black: '#1a1a1a',
        },
      },
      fontFamily: {
        garamond: ["'EB Garamond'", 'serif'],
      },
    },
  },
  plugins: [],
}
