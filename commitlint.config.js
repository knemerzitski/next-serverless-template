/**
 * Configuration for commitlint
 *
 * @see {@link https://commitlint.js.org/#/} for documentation
 */

const changelogConfig = require('./changelog.config');
const commitTypesConfig = require('./commit-types.config');

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', commitTypesConfig.map(({ type }) => type)],
    'scope-enum': [2, 'always', changelogConfig.scopes],
    'subject-min-length': [2, 'always', changelogConfig.minMessageLength ?? 3],
    'subject-max-length': [2, 'always', changelogConfig.maxMessageLength ?? 64],
    'body-max-length': [0],
    'body-max-line-length': [0],
    'footer-max-length': [0],
    'footer-max-line-length': [0],
  },
};
