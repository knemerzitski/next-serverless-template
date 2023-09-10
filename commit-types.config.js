/**
 * @typedef {Object} Type
 * @property {string} type
 * @property {'major' | 'minor' | 'patch' | undefined} [release]
 * @property {string} description
 * @property {string | undefined} [section]
 * @property {boolean | undefined} [hidden]
 * @property {emoji} emoji
 */

/**
 * @type {Array.<Type>}
 */
module.exports = [
  {
    type: 'feat',
    release: 'minor',
    description: 'A new feature',
    section: 'Features',
    emoji: '🎸',
    hidden: false,
  },
  {
    type: 'fix',
    release: 'patch',
    description: 'A bug fix',
    section: 'Bux Fixes',
    hidden: false,
    emoji: '🐛',
  },
  {
    type: 'chore',
    release: undefined,
    description: 'Build process or auxiliary tool changes',
    section: 'Chore',
    hidden: true,
    emoji: '🤖',
  },
  {
    type: 'ci',
    release: undefined,
    description: 'CI related changes',
    section: 'Continuous Integration',
    hidden: false,
    emoji: '🎡',
  },
  {
    type: 'docs',
    release: undefined,
    description: 'Documentation only changes',
    section: 'Documentation',
    hidden: false,
    emoji: '✏️',
  },
  {
    type: 'perf',
    release: 'patch',
    description: 'A code change that improves performance',
    section: 'Performance Improvements',
    hidden: false,
    emoji: '⚡️',
  },
  {
    type: 'refactor',
    release: undefined,
    description: 'A code change that neither fixes a bug or adds a feature',
    section: 'Code Refactoring',
    hidden: true,
    emoji: '💡',
  },
  {
    type: 'release',
    release: undefined,
    description: 'Create a release commit',
    section: undefined,
    hidden: true,
    emoji: '🏹',
  },
  {
    type: 'style',
    release: undefined,
    description: 'Markup, white-space, formatting, missing semi-colons...',
    section: 'Styles',
    hidden: true,
    emoji: '💄',
  },
  {
    type: 'test',
    release: undefined,
    description: 'Adding missing tests',
    section: 'Tests',
    hidden: false,
    emoji: '💍',
  },
];
