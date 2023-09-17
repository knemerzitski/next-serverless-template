const path = require('path');

/**
 * Using eslint directly instead of `next lint` due to overrides not working in eslint config
 * @see {@link https://github.com/vercel/next.js/issues/35228}
 * @param {*} filenames
 * @returns
 */
const buildEslintCommand = (filenames) =>
  `eslint --fix --cache ${filenames.map((f) => path.relative(process.cwd(), f)).join(' ')}`;

module.exports = {
  '*.{js,jsx,ts,tsx}': [buildEslintCommand],
  '**/*': ['prettier --write --ignore-unknown'],
};
