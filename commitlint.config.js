module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-min-length': [2, 'always', 3],
    'subject-max-length': [2, 'always', 64],
    'body-max-length': [0],
    'body-max-line-length': [0],
    'footer-max-length': [0],
    'footer-max-line-length': [0],
  },
};
