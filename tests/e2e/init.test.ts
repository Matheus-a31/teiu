import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createInitCommand } from '../../src/commands/init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('E2E: teiu init', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teiu-e2e-init-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should run end-to-end init on Spring Boot Maven project', async () => {
    const fixtureDir = path.join(fixturesDir, 'spring-maven');
    fs.cpSync(fixtureDir, tempDir, { recursive: true });

    const cmd = createInitCommand();
    await cmd.parseAsync(['node', 'init', tempDir, '--yes', '--db', 'postgres']);

    // Verifica todos os 5 arquivos gerados
    const expectedFiles = [
      'Dockerfile',
      '.dockerignore',
      'docker-compose.yml',
      '.env.example',
      '.github/workflows/ci.yml',
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(tempDir, file))).toBe(true);
    }

    // Valida consistência entre os arquivos
    const dockerfile = fs.readFileSync(path.join(tempDir, 'Dockerfile'), 'utf-8');
    const compose = fs.readFileSync(path.join(tempDir, 'docker-compose.yml'), 'utf-8');
    const ci = fs.readFileSync(path.join(tempDir, '.github/workflows/ci.yml'), 'utf-8');
    const env = fs.readFileSync(path.join(tempDir, '.env.example'), 'utf-8');

    expect(dockerfile).toContain('EXPOSE 8080');
    expect(compose).toContain('${PORT:-8080}:8080');
    expect(compose).toContain('POSTGRES_DB');
    expect(env).toContain('POSTGRES_DB');
    expect(ci).toContain('actions/setup-java@v4');
  });

  it('should run end-to-end init on NestJS project with custom services', async () => {
    const fixtureDir = path.join(fixturesDir, 'nest-npm');
    fs.cpSync(fixtureDir, tempDir, { recursive: true });

    const cmd = createInitCommand();
    await cmd.parseAsync([
      'node',
      'init',
      tempDir,
      '--yes',
      '--db',
      'postgres',
      '--cache',
      'redis',
      '--registry',
      'ghcr',
    ]);

    const expectedFiles = [
      'Dockerfile',
      '.dockerignore',
      'docker-compose.yml',
      '.env.example',
      '.github/workflows/ci.yml',
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(tempDir, file))).toBe(true);
    }

    const compose = fs.readFileSync(path.join(tempDir, 'docker-compose.yml'), 'utf-8');
    expect(compose).toContain('postgres:');
    expect(compose).toContain('redis:');

    const env = fs.readFileSync(path.join(tempDir, '.env.example'), 'utf-8');
    expect(env).toContain('POSTGRES_USER=');
    expect(env).toContain('REDIS_PORT=6379');

    const ci = fs.readFileSync(path.join(tempDir, '.github/workflows/ci.yml'), 'utf-8');
    expect(ci).toContain('npm ci');
    expect(ci).toContain('ghcr.io');
  });
});
