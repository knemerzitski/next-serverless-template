const commitTypesConfig = require('./commit-types.config');

module.exports = {
  disableEmoji: false,
  format: '{type}{scope}: {emoji}{subject}',
  list: commitTypesConfig.map(({ type }) => type),
  maxMessageLength: 64,
  minMessageLength: 3,
  questions: ['type', 'scope', 'subject', 'body', 'breaking', 'issues', 'lerna'],
  types: Object.fromEntries(
    commitTypesConfig.map(({ type, description, emoji }) => [type, { description, emoji, value: type }])
  ),
  breakingChangePrefix: '🧨',
  closedIssuePrefix: '✅',
};
