import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { createInitCommand } from '../../src/commands/init.js';
import { runCliCommand, withTempDir, assertFilesExist, readTextFile } from '../test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

const ALL_ARTIFACTS = [
  'Dockerfile',
  '.dockerignore',
  'docker-compose.yml',
  '.env.example',
  '.github/workflows/ci.yml',
];

describe('E2E: teiu init', () => {
  it('should run end-to-end init on Spring Boot Maven project', async () => {
    await withTempDir('teiu-e2e-spring-', async (tempDir) => {
      fs.cpSync(path.join(fixturesDir, 'spring-maven'), tempDir, { recursive: true });

      await runCliCommand(createInitCommand, 'init', [tempDir, '--yes', '--db', 'postgres']);

      assertFilesExist(tempDir, ALL_ARTIFACTS);

      expect(readTextFile(tempDir, 'Dockerfile')).toContain('EXPOSE 8080');
      expect(readTextFile(tempDir, 'docker-compose.yml')).toContain('${PORT:-8080}:8080');
      expect(readTextFile(tempDir, 'docker-compose.yml')).toContain('POSTGRES_DB');
      expect(readTextFile(tempDir, '.env.example')).toContain('POSTGRES_DB');
      expect(readTextFile(tempDir, '.github/workflows/ci.yml')).toContain('actions/setup-java@v4');
    });
  });

  it('should run end-to-end init on NestJS project with custom services', async () => {
    await withTempDir('teiu-e2e-nest-', async (tempDir) => {
      fs.cpSync(path.join(fixturesDir, 'nest-npm'), tempDir, { recursive: true });

      await runCliCommand(createInitCommand, 'init', [
        tempDir,
        '--yes',
        '--db',
        'postgres',
        '--cache',
        'redis',
        '--registry',
        'ghcr',
      ]);

      assertFilesExist(tempDir, ALL_ARTIFACTS);

      expect(readTextFile(tempDir, 'docker-compose.yml')).toContain('postgres:');
      expect(readTextFile(tempDir, 'docker-compose.yml')).toContain('redis:');
      expect(readTextFile(tempDir, '.env.example')).toContain('POSTGRES_USER=');
      expect(readTextFile(tempDir, '.env.example')).toContain('REDIS_PORT=6379');
      expect(readTextFile(tempDir, '.github/workflows/ci.yml')).toContain('npm ci');
      expect(readTextFile(tempDir, '.github/workflows/ci.yml')).toContain('ghcr.io');
    });
  });
});
