const path = require('node:path');

// TrendScout palette: BLACK · GOLD · RED · GRAY only.
// Existing utility classes are re-mapped so every component picks the theme up automatically:
//   indigo  -> gold        (primary / accents / links)
//   emerald -> rich gold   ("good": active ads, high scores, green margin tier)
//   amber   -> muted champagne-gray ("medium": yellow margin tier, unknown)
//   sky     -> gray        ("neutral" badges)
//   red     -> crimson     ("danger" / low margin / Hot)
//   slate   -> black-to-gray neutrals (backgrounds, borders, text)
const gold = { 50: '#FFF9E6', 100: '#FDF0C4', 200: '#F9E391', 300: '#F1CF5A', 400: '#E6BC32', 500: '#D4AF37', 600: '#B8921F', 700: '#8F7016', 800: '#6B5410', 900: '#4A3A0C', 950: '#2E2407' };
module.exports = {
  darkMode: 'class',
  content: [path.join(__dirname, 'extension').replace(/\\/g, '/') + '/**/*.{html,js,jsx}'],
  theme: {
    extend: {
      colors: {
        indigo: gold,
        emerald: gold,
        amber: { 50: '#F8F4EA', 100: '#EFE8D8', 200: '#E0D4B8', 300: '#C9B88F', 400: '#A8966B', 500: '#8A7A55', 600: '#6F6244', 700: '#594E36', 800: '#453C2A', 900: '#2F291C', 950: '#1B1810' },
        sky: { 50: '#F4F4F5', 100: '#E8E8EA', 200: '#D6D6D9', 300: '#B9B9BE', 400: '#8E8E94', 500: '#6B6B72', 600: '#4A4A50', 700: '#2A2A2E', 800: '#2A2A2E', 900: '#1F1F22', 950: '#111113' },
        red: { 50: '#FDECEC', 100: '#FAD1D1', 200: '#F5A3A3', 300: '#EE6B6B', 400: '#E23B3B', 500: '#D01E26', 600: '#B3141C', 700: '#8F0F16', 800: '#6E0B11', 900: '#4A080C', 950: '#2D0407' },
        slate: { 50: '#F4F4F5', 100: '#E8E8EA', 200: '#D6D6D9', 300: '#B9B9BE', 400: '#8E8E94', 500: '#6B6B72', 600: '#4A4A50', 700: '#2A2A2E', 800: '#161618', 900: '#0B0B0C', 950: '#050505' },
      },
    },
  },
  plugins: [],
};
