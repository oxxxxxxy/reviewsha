import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/unit/modules/auth/**/*.test.ts',
      'tests/unit/modules/sessions/**/*.test.ts',
      'tests/unit/modules/users/**/*.test.ts',
      'tests/unit/common/auth/**/*.test.ts',
      'tests/integration/modules/auth/**/*.test.ts',
      'tests/integration/modules/users/**/*.test.ts',
      'tests/unit/swagger/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage/stage4',
      include: [
        'src/modules/auth/services/**/*.ts',
        'src/modules/sessions/services/**/*.ts',
        'src/modules/users/services/**/*.ts',
        'src/common/auth/guards/**/*.ts',
        'src/common/auth/decorators/**/*.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 65,
        functions: 80,
        lines: 80,
      },
    },
  },
});
