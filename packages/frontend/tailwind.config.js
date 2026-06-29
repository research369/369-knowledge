/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0a1628",
          light: "#112040",
        },
        "blue-mid": "#2563eb",
        gold: {
          DEFAULT: "#d4a017",
          light: "#f0c040",
        },
      },
      fontFamily: {
        sans: ["Barlow", "system-ui", "sans-serif"],
        heading: ["Barlow Condensed", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
