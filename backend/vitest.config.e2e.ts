import { defineConfig } from 'vitest/config';

// Shared with test/global-setup.ts, which creates this database if it is missing
process.env.TEST_DATABASE_URL ??=
  'postgres://chat:chat@localhost:5432/chat_test';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // Test files share one database, so they must not run in parallel
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      JWT_SECRET: 'test-secret-that-is-long-enough-for-the-check',
    },
  },
});
