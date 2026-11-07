import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createInitCommand } from '../../src/commands/init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

function checkAllArtifactsPresent(dir: string) {
  const artifacts = [
    'Dockerfile',
    '.dockerignore',
    'docker-compose.yml',
    '.env.example',
    '.github/workflows/ci.yml',
  ];
  for (const artifact of artifacts) {
    expect(fs.existsSync(path.join(dir, artifact))).toBe(true);
  }
}

function readArtifact(dir: string, file: string): string {
  return fs.readFileSync(path.join(dir, file), 'utf-8');
}

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
    fs.cpSync(path.join(fixturesDir, 'spring-maven'), tempDir, { recursive: true });

    const cmd = createInitCommand();
    await cmd.parseAsync(['node', 'init', tempDir, '--yes', '--db', 'postgres']);

    checkAllArtifactsPresent(tempDir);

    expect(readArtifact(tempDir, 'Dockerfile')).toContain('EXPOSE 8080');
    expect(readArtifact(tempDir, 'docker-compose.yml')).toContain('${PORT:-8080}:8080');
    expect(readArtifact(tempDir, 'docker-compose.yml')).toContain('POSTGRES_DB');
    expect(readArtifact(tempDir, '.env.example')).toContain('POSTGRES_DB');
    expect(readArtifact(tempDir, '.github/workflows/ci.yml')).toContain('actions/setup-java@v4');
  });

  it('should run end-to-end init on NestJS project with custom services', async () => {
    fs.cpSync(path.join(fixturesDir, 'nest-npm'), tempDir, { recursive: true });

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

    checkAllArtifactsPresent(tempDir);

    expect(readArtifact(tempDir, 'docker-compose.yml')).toContain('postgres:');
    expect(readArtifact(tempDir, 'docker-compose.yml')).toContain('redis:');
    expect(readArtifact(tempDir, '.env.example')).toContain('POSTGRES_USER=');
    expect(readArtifact(tempDir, '.env.example')).toContain('REDIS_PORT=6379');
    expect(readArtifact(tempDir, '.github/workflows/ci.yml')).toContain('npm ci');
    expect(readArtifact(tempDir, '.github/workflows/ci.yml')).toContain('ghcr.io');
  });
});
