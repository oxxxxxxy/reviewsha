import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'packages/sdk/src/generated/**',
      '*.drawio',
    ],
  },
  ...tseslint.configs.recommended,
];
