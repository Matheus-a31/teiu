import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { createInitCommand } from '../../src/commands/init.js';
import { runCliCommand, withTempDir, assertFilesExist, readTextFile } from '../test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

const ALL_INFRA_FILES = [
  'Dockerfile',
  '.dockerignore',
  'docker-compose.yml',
  '.env.example',
  '.github/workflows/ci.yml',
];

describe('Command: init', () => {
  it('should support dry-run mode without writing files', async () => {
    const fixtureDir = path.join(fixturesDir, 'spring-maven');
    const output = await runCliCommand(createInitCommand, 'init', [
      fixtureDir,
      '--dry-run',
      '--yes',
    ]);

    expect(output).toBeDefined();
  });

  it('should support JSON output in init command', async () => {
    const fixtureDir = path.join(fixturesDir, 'nest-npm');
    const output = await runCliCommand(createInitCommand, 'init', [
      fixtureDir,
      '--dry-run',
      '--yes',
      '--json',
    ]);
    const parsed = JSON.parse(output);

    expect(parsed.success).toBe(true);
    expect(parsed.stack).toBe('nest');
    expect(parsed.dryRun).toBe(true);
    expect(parsed.results.length).toBeGreaterThanOrEqual(4);
  });

  it('should generate all infrastructure files for Spring Boot project with --yes', async () => {
    await withTempDir('teiu-init-spring-', async (tempDir) => {
      fs.cpSync(path.join(fixturesDir, 'spring-maven'), tempDir, { recursive: true });

      await runCliCommand(createInitCommand, 'init', [tempDir, '--yes']);

      assertFilesExist(tempDir, ALL_INFRA_FILES);

      const dockerfile = readTextFile(tempDir, 'Dockerfile');
      expect(dockerfile).toContain('eclipse-temurin:21-jdk-alpine');
      expect(dockerfile).toContain('USER app');
      expect(dockerfile).toContain('HEALTHCHECK');

      const compose = readTextFile(tempDir, 'docker-compose.yml');
      expect(compose).toContain('services:');
      expect(compose).toContain('postgres:');

      const env = readTextFile(tempDir, '.env.example');
      expect(env).toContain('POSTGRES_DB=');

      const ci = readTextFile(tempDir, '.github/workflows/ci.yml');
      expect(ci).toContain('name: CI / CD');
      expect(ci).toContain('actions/setup-java@v4');
      expect(ci).toContain('./mvnw clean verify');
    });
  });

  it('should generate all infrastructure files for NestJS with custom services', async () => {
    await withTempDir('teiu-init-nest-', async (tempDir) => {
      fs.cpSync(path.join(fixturesDir, 'nest-pnpm'), tempDir, { recursive: true });

      await runCliCommand(createInitCommand, 'init', [
        tempDir,
        '--db',
        'mysql',
        '--cache',
        'redis',
        '--yes',
      ]);

      assertFilesExist(tempDir, ALL_INFRA_FILES);

      const dockerfile = readTextFile(tempDir, 'Dockerfile');
      expect(dockerfile).toContain('pnpm');
      expect(dockerfile).toContain('USER node');

      const compose = readTextFile(tempDir, 'docker-compose.yml');
      expect(compose).toContain('mysql:');
      expect(compose).toContain('redis:');

      const env = readTextFile(tempDir, '.env.example');
      expect(env).toContain('MYSQL_DATABASE=');
      expect(env).toContain('REDIS_PORT=6379');

      const ci = readTextFile(tempDir, '.github/workflows/ci.yml');
      expect(ci).toContain('pnpm/action-setup@v4');
      expect(ci).toContain('pnpm install --frozen-lockfile');
    });
  });
});
