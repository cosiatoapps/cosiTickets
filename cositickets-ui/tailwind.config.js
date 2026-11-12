/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cosi: {
          black: '#05070E',
          dark: '#0D111D',
          darker: '#090C16',
          purple: '#8B5CF6',
          'purple-hover': '#7C3AED',
          yellow: '#FACC15',
          green: '#10B981',
          cyan: '#06B6D4',
          rose: '#F43F5E',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}