import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createInitCommand } from '../../src/commands/init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

async function executeInitCommand(args: string[]): Promise<string> {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    const cmd = createInitCommand();
    await cmd.parseAsync(['node', 'init', ...args]);
    return logSpy.mock.calls.map((c) => c[0]).join('\n');
  } finally {
    logSpy.mockRestore();
  }
}

function verifyGeneratedInfraFiles(dir: string): void {
  const expectedFiles = [
    'Dockerfile',
    '.dockerignore',
    'docker-compose.yml',
    '.env.example',
    '.github/workflows/ci.yml',
  ];
  for (const file of expectedFiles) {
    expect(fs.existsSync(path.join(dir, file))).toBe(true);
  }
}

describe('Command: init', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teiu-init-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should support dry-run mode without writing files', async () => {
    const fixtureDir = path.join(fixturesDir, 'spring-maven');
    const output = await executeInitCommand([fixtureDir, '--dry-run', '--yes']);

    expect(output).toBeDefined();
  });

  it('should support JSON output in init command', async () => {
    const fixtureDir = path.join(fixturesDir, 'nest-npm');
    const output = await executeInitCommand([fixtureDir, '--dry-run', '--yes', '--json']);
    const parsed = JSON.parse(output);

    expect(parsed.success).toBe(true);
    expect(parsed.stack).toBe('nest');
    expect(parsed.dryRun).toBe(true);
    expect(parsed.results.length).toBeGreaterThanOrEqual(4);
  });

  it('should generate all infrastructure files for Spring Boot project with --yes', async () => {
    fs.cpSync(path.join(fixturesDir, 'spring-maven'), tempDir, { recursive: true });

    await executeInitCommand([tempDir, '--yes']);

    verifyGeneratedInfraFiles(tempDir);

    const dockerfile = fs.readFileSync(path.join(tempDir, 'Dockerfile'), 'utf-8');
    expect(dockerfile).toContain('eclipse-temurin:21-jdk-alpine');
    expect(dockerfile).toContain('USER app');
    expect(dockerfile).toContain('HEALTHCHECK');

    const compose = fs.readFileSync(path.join(tempDir, 'docker-compose.yml'), 'utf-8');
    expect(compose).toContain('services:');
    expect(compose).toContain('postgres:');

    const env = fs.readFileSync(path.join(tempDir, '.env.example'), 'utf-8');
    expect(env).toContain('POSTGRES_DB=');

    const ci = fs.readFileSync(path.join(tempDir, '.github/workflows/ci.yml'), 'utf-8');
    expect(ci).toContain('name: CI / CD');
    expect(ci).toContain('actions/setup-java@v4');
    expect(ci).toContain('./mvnw clean verify');
  });

  it('should generate all infrastructure files for NestJS with custom services', async () => {
    fs.cpSync(path.join(fixturesDir, 'nest-pnpm'), tempDir, { recursive: true });

    await executeInitCommand([
      tempDir,
      '--db',
      'mysql',
      '--cache',
      'redis',
      '--yes',
    ]);

    verifyGeneratedInfraFiles(tempDir);

    const dockerfile = fs.readFileSync(path.join(tempDir, 'Dockerfile'), 'utf-8');
    expect(dockerfile).toContain('pnpm');
    expect(dockerfile).toContain('USER node');

    const compose = fs.readFileSync(path.join(tempDir, 'docker-compose.yml'), 'utf-8');
    expect(compose).toContain('mysql:');
    expect(compose).toContain('redis:');

    const env = fs.readFileSync(path.join(tempDir, '.env.example'), 'utf-8');
    expect(env).toContain('MYSQL_DATABASE=');
    expect(env).toContain('REDIS_PORT=6379');

    const ci = fs.readFileSync(path.join(tempDir, '.github/workflows/ci.yml'), 'utf-8');
    expect(ci).toContain('pnpm/action-setup@v4');
    expect(ci).toContain('pnpm install --frozen-lockfile');
  });
});
