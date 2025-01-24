import { configDefaults, coverageConfigDefaults, defineConfig } from 'vitest/config';
import type { ViteUserConfig } from 'vitest/config';

const defaultThresholds = 100;

const defaultConfig: ViteUserConfig = defineConfig({
  test: {
    environment: 'node',
    root: process.cwd(),
    include: ['__tests__/**/*.spec.(c|m)?[tj]s'],
    exclude: [...configDefaults.exclude, '*.config.(c|m)?[tj]s', 'scripts/**/*'],
    reporters: ['verbose'],
    passWithNoTests: true,
    coverage: {
      exclude: [
        '**/@types/**/*.?(c|m)ts',
        '**/*Interface.?(c|m)ts',
        '**/*Type.?(c|m)ts',
        ...coverageConfigDefaults.exclude,
      ],
      enabled: false,
      provider: 'v8',
      all: true,
      ignoreEmptyLines: true,
      reportOnFailure: true,
      reportsDirectory: 'reports/coverage',
      thresholds: {
        branches: defaultThresholds,
        functions: defaultThresholds,
        lines: defaultThresholds,
        statements: defaultThresholds,
      },
    },
  },
});

export default defaultConfig;
