const typesConfig = require('./commit-types.config');

const changelogFile = 'CHANGELOG.md';

module.exports = {
  branches: ['release', { name: 'beta', prerelease: true }],
  tagFormat: 'v${version}',
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { breaking: true, release: 'major' },
          { revert: true, release: 'patch' },
          ...typesConfig.filter(({ release }) => release).map(({ type, release }) => ({ type, release })),
        ],
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: typesConfig.map(({ type, section, hidden }) => ({
            type,
            section,
            hidden: hidden ?? true,
          })),
        },
      },
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile,
        changelogTitle:
          '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/) and this project adheres to [Semantic Versioning](https://semver.org/).\n\n## [Released](https://github.com/knemerzitski/next-template/releases)',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'package-lock.json', changelogFile],
        message: 'release: 🏹 ${nextRelease.gitTag} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    [
      '@semantic-release/github',
      {
        releasedLabels: ['released', 'released-in-${nextRelease.gitTag}'],
        successComment:
          "🎉 This ${issue.pull_request ? 'pull request' : 'issue'} is included in version ${nextRelease.gitTag}.",
      },
    ],
  ],
};
