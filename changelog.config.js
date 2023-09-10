/**
 * Configuration for git-cz
 *
 * @see {@link https://github.com/streamich/git-cz} for documentation
 */

const commitTypesConfig = require('./commit-types.config');

module.exports = {
  disableEmoji: false,
  format: '{type}{scope}: {emoji}{subject}',
  list: commitTypesConfig.map(({ type }) => type),
  maxMessageLength: 64,
  minMessageLength: 3,
  questions: ['type', 'subject', 'body', 'breaking', 'issues'],
  types: Object.fromEntries(
    commitTypesConfig.map(({ type, description, emoji }) => [type, { description, emoji, value: type }])
  ),
  breakingChangePrefix: '🧨',
  closedIssuePrefix: '✅',
};
