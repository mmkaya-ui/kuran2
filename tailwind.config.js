/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx,html}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      transitionProperty: {
        height: 'height',
        spacing: 'margin, padding'
      },
      colors: {
        emerald: {
          450: '#10b981'
        }
      }
    }
  },
  plugins: []
};
