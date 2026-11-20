// Standard Tailwind + Autoprefixer pipeline. Vite finds this via `css.postcss` in vite.config.js.
const path = require('node:path');
module.exports = {
  plugins: {
    tailwindcss: { config: path.join(__dirname, 'tailwind.config.cjs') },
    autoprefixer: {},
  },
};
