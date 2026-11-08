import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { auditCiWorkflow } from '../../src/audit/ci-rules.js';
import { readTextFile } from '../test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('Audit: CI Rules', () => {
  it('should detect missing cache, missing tests and hardcoded credentials', () => {
    const badContent = `
name: Bad CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build without test
        run: echo "No tests"
      - name: Push with plaintext
        run: docker login -u admin -p "secret123"
        password: "raw_password_here"
`;
    const results = auditCiWorkflow({
      content: badContent,
      workflowPath: '.github/workflows/ci.yml',
    });

    const failedIds = results.filter((r) => !r.passed).map((r) => r.id);
    expect(failedIds).toContain('CI_CACHE');
    expect(failedIds).toContain('CI_TESTS');
    expect(failedIds).toContain('CI_HARDCODED_SECRETS');
  });

  it('should pass all rules on a well-configured pipeline', () => {
    const goodDir = path.join(fixturesDir, 'audit-good');
    const content = readTextFile(goodDir, '.github/workflows/ci.yml');

    const results = auditCiWorkflow({
      content,
      workflowPath: path.join(goodDir, '.github/workflows/ci.yml'),
    });

    const failed = results.filter((r) => !r.passed);
    expect(failed.length).toBe(0);
  });

  it.each([
    ['npm test', 'run: npm test'],
    ['yarn test', 'run: yarn test'],
    ['pnpm run test', 'run: pnpm run test'],
    ['mvn verify', 'run: mvn clean verify'],
    ['./mvnw test', 'run: ./mvnw -B test'],
    ['gradle check', 'run: gradle check'],
    ['./gradlew test', 'run: ./gradlew test'],
  ])('should recognize test runner command: %s', (_, runCommand) => {
    const content = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          cache: 'npm'
      - ${runCommand}
`;
    const results = auditCiWorkflow({
      content,
      workflowPath: '.github/workflows/ci.yml',
    });

    const testRule = results.find((r) => r.id === 'CI_TESTS');
    expect(testRule?.passed).toBe(true);
  });

  it('should not recognize commented out test commands', () => {
    const content = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      # run: ./mvnw test
      # run: npm test
      - run: echo "skipped tests"
`;
    const results = auditCiWorkflow({
      content,
      workflowPath: '.github/workflows/ci.yml',
    });

    const testRule = results.find((r) => r.id === 'CI_TESTS');
    expect(testRule?.passed).toBe(false);
  });
});
