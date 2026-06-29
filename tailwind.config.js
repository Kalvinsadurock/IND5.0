/** @type {import('tailwindcss').Config} */
export default {
  // Ensure './src/app/**/*.{ts,tsx}' is included if your App.tsx is inside /app
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}" 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}