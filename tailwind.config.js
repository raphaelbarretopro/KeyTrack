/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          sand: '#f4f4ec',
          ink: '#17261f',
          teal: '#0f766e',
          amber: '#d97706',
          red: '#b42318',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 18px 50px rgba(23, 38, 31, 0.12)',
      },
      backgroundImage: {
        grid: 'radial-gradient(circle at 1px 1px, rgba(15,118,110,0.06) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
}