
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 다크 모드 활성화
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3490dc', 
        secondary: '#6574cd', 
        accent: '#38c172', 
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8', // Added for more shades
          500: '#64748b', // Added for more shades
          600: '#475569', // Added for more shades
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        base: { // Making 'base' an object for light/dark variants
          DEFAULT: '#ffffff', // Light mode base
          dark: '#0f172a', // Dark mode base (could be neutral-900 or a specific dark bg)
        },
        info: '#3ab3b3',
        success: '#48bb78',
        warning: '#f59e0b',
        error: '#e3342f',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}