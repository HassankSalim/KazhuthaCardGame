/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'felt-light': '#c5d5c5',
        'felt-muted': '#a3bca3',
        'felt-dim': '#90a690',
        'surface': {
          base: '#1a2e1a',
          card: '#243d24',
          raised: '#2d4a2d',
          active: '#3d5a3d',
          deep: '#1e3220',
          border: '#4a6b4a',
        },
        'suit': {
          red: '#dc2626',
          black: '#1a1a1a',
        },
      },
    },
  },
  plugins: [],
}
