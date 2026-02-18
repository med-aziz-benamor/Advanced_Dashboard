/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'charcoal': {
          50: '#f6f6f7',
          100: '#e1e2e5',
          200: '#c3c5cb',
          300: '#9fa2ab',
          400: '#797e8a',
          500: '#5f6370',
          600: '#4b4e59',
          700: '#3e4048',
          800: '#36383e',
          900: '#2f3136',
          950: '#1a1b1e',
        },
      },
    },
  },
  plugins: [],
}
