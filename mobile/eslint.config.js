// ESLint 9 flat config that consumes the legacy eslint-config-expo preset
// via the FlatCompat shim. eslint-config-expo 8.x is still .eslintrc-style.
const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  // TODO(hardening): address in dedicated cleanup
  // eslint-disable-next-line no-undef
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.expo/**',
      'ios/**',
      'android/**',
      'build/**',
      'coverage/**',
    ],
  },
  ...compat.extends('expo'),
  {
    linterOptions: {
      // Keep migration additive: do not silently strip pre-existing disable
      // directives elsewhere in the tree. Revisit in a dedicated cleanup.
      reportUnusedDisableDirectives: 'off',
    },
  },
];
