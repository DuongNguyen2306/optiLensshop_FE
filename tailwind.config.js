/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      keyframes: {
        "home-category-icon-hover": {
          "0%, 100%": { transform: "rotate(0deg) scale(1)" },
          "40%": { transform: "rotate(-8deg) scale(1.06)" },
          "70%": { transform: "rotate(8deg) scale(1.06)" },
        },
      },
      animation: {
        "home-category-icon-hover": "home-category-icon-hover 0.55s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
