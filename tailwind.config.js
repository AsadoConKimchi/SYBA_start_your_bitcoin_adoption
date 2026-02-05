/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#F7931A',
        'primary-dark': '#E8850F',
        'primary-light': '#FFB347',
        bitcoin: '#F7931A',
        lightning: '#792DE4',
      },
    },
  },
  plugins: [],
};
