import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, vi } from 'vitest';
import YAML from 'yaml';
import { createComposeCommand } from '../../src/commands/compose.js';

describe('Command: compose', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('should support dry-run mode without creating files', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cmd = createComposeCommand();

    await cmd.parseAsync([
      'node',
      'compose',
      '--dry-run',
      '--dir',
      path.join(fixturesDir, 'nest-npm'),
    ]);

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should support JSON output in compose command', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cmd = createComposeCommand();

    await cmd.parseAsync([
      'node',
      'compose',
      '--dry-run',
      '--json',
      '--db',
      'postgres',
      '--cache',
      'redis',
      '--dir',
      path.join(fixturesDir, 'nest-npm'),
    ]);

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(output as string);

    expect(parsed.success).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.addedServices).toEqual(['postgres', 'redis']);

    logSpy.mockRestore();
  });

  it('should generate docker-compose.yml and .env.example with --yes', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teiu-cmd-compose-'));
    fs.cpSync(path.join(fixturesDir, 'nest-pnpm'), tempDir, { recursive: true });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cmd = createComposeCommand();

    await cmd.parseAsync([
      'node',
      'compose',
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

    const composeParsed = YAML.parse(fs.readFileSync(composePath, 'utf-8'));
    expect(composeParsed.services.postgres).toBeDefined();
    expect(composeParsed.services.redis).toBeDefined();
    expect(composeParsed.services.app.depends_on.postgres.condition).toBe('service_healthy');

    logSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should perform intelligent merge when docker-compose.yml already exists', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teiu-cmd-compose-merge-'));
    fs.cpSync(path.join(fixturesDir, 'spring-maven'), tempDir, { recursive: true });

    const composePath = path.join(tempDir, 'docker-compose.yml');
    const existingCompose = `
services:
  app:
    image: my-app:latest
    ports:
      - "8080:8080"
`;
    fs.writeFileSync(composePath, existingCompose, 'utf-8');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cmd = createComposeCommand();

    await cmd.parseAsync(['node', 'compose', '--yes', '--db', 'postgres', '--dir', tempDir]);

    const updatedCompose = YAML.parse(fs.readFileSync(composePath, 'utf-8'));
    // Preservou customização do app
    expect(updatedCompose.services.app.image).toBe('my-app:latest');
    // Adicionou postgres
    expect(updatedCompose.services.postgres.image).toBe('postgres:16-alpine');
    // Vinculou depends_on
    expect(updatedCompose.services.app.depends_on.postgres.condition).toBe('service_healthy');

    logSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
