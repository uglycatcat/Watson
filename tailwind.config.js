/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "DM Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        watson: {
          bg: "#0f1419",
          surface: "#1a2332",
          border: "#2d3a4d",
          accent: "#3b82f6",
          muted: "#8b9cb3",
        },
      },
    },
  },
  plugins: [],
};
