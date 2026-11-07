import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import YAML from 'yaml';
import { createComposeCommand } from '../../src/commands/compose.js';
import { runCliCommand, withTempDir, readTextFile } from '../test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('Command: compose', () => {
  it('should support dry-run mode without creating files', async () => {
    const output = await runCliCommand(createComposeCommand, 'compose', [
      '--dry-run',
      '--dir',
      path.join(fixturesDir, 'nest-npm'),
    ]);

    expect(output).toBeDefined();
  });

  it('should support JSON output in compose command', async () => {
    const output = await runCliCommand(createComposeCommand, 'compose', [
      '--dry-run',
      '--json',
      '--db',
      'postgres',
      '--cache',
      'redis',
      '--dir',
      path.join(fixturesDir, 'nest-npm'),
    ]);
    const parsed = JSON.parse(output);

    expect(parsed.success).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.addedServices).toEqual(['postgres', 'redis']);
  });

  it('should generate docker-compose.yml and .env.example with --yes', async () => {
    await withTempDir('teiu-cmd-compose-', async (tempDir) => {
      fs.cpSync(path.join(fixturesDir, 'nest-pnpm'), tempDir, { recursive: true });

      await runCliCommand(createComposeCommand, 'compose', [
        '--yes',
        '--db',
        'postgres',
        '--cache',
        'redis',
        '--dir',
        tempDir,
      ]);

      const composePath = path.join(tempDir, 'docker-compose.yml');
      const envExamplePath = path.join(tempDir, '.env.example');

      expect(fs.existsSync(composePath)).toBe(true);
      expect(fs.existsSync(envExamplePath)).toBe(true);

      const composeParsed = YAML.parse(readTextFile(tempDir, 'docker-compose.yml'));
      expect(composeParsed.services.postgres).toBeDefined();
      expect(composeParsed.services.redis).toBeDefined();
      expect(composeParsed.services.app.depends_on.postgres.condition).toBe('service_healthy');
    });
  });

  it('should perform intelligent merge when docker-compose.yml already exists', async () => {
    await withTempDir('teiu-cmd-compose-merge-', async (tempDir) => {
      fs.cpSync(path.join(fixturesDir, 'spring-maven'), tempDir, { recursive: true });

      const existingCompose = `
services:
  app:
    image: my-app:latest
    ports:
      - "8080:8080"
`;
      fs.writeFileSync(path.join(tempDir, 'docker-compose.yml'), existingCompose, 'utf-8');

      await runCliCommand(createComposeCommand, 'compose', [
        '--yes',
        '--db',
        'postgres',
        '--cache',
        'redis',
        '--dir',
        tempDir,
      ]);

      const mergedContent = readTextFile(tempDir, 'docker-compose.yml');
      const merged = YAML.parse(mergedContent);

      expect(merged.services.app.image).toBe('my-app:latest');
      expect(merged.services.postgres).toBeDefined();
      expect(merged.services.redis).toBeDefined();
    });
  });
});
