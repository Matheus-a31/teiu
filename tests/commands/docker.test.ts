import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, vi } from 'vitest';
import { createDockerCommand } from '../../src/commands/docker.js';

describe('Command: docker', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('should support dry-run mode without creating files', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cmd = createDockerCommand();

    await cmd.parseAsync([
      'node',
      'docker',
      '--dry-run',
      '--dir',
      path.join(fixturesDir, 'spring-maven'),
    ]);

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should support JSON output in docker command', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cmd = createDockerCommand();

    await cmd.parseAsync([
      'node',
      'docker',
      '--dry-run',
      '--json',
      '--dir',
      path.join(fixturesDir, 'spring-maven'),
    ]);

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(output as string);

    expect(parsed.success).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.results.length).toBe(2);

    logSpy.mockRestore();
  });

  it.each([
    {
      stack: 'Spring',
      fixture: 'spring-maven',
      expectedBuilder: 'FROM eclipse-temurin:21-jdk-alpine AS builder',
      expectedUser: 'USER app',
    },
    {
      stack: 'NestJS',
      fixture: 'nest-npm',
      expectedBuilder: 'FROM node:20-alpine AS deps',
      expectedUser: 'USER node',
    },
  ])(
    'should write Dockerfile and .dockerignore for $stack when running with --yes',
    async ({ fixture, expectedBuilder, expectedUser }) => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teiu-cmd-docker-'));
      try {
        fs.cpSync(path.join(fixturesDir, fixture), tempDir, { recursive: true });

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const cmd = createDockerCommand();

        await cmd.parseAsync(['node', 'docker', '--yes', '--dir', tempDir]);

        expect(fs.existsSync(path.join(tempDir, 'Dockerfile'))).toBe(true);
        expect(fs.existsSync(path.join(tempDir, '.dockerignore'))).toBe(true);

        const dockerfile = fs.readFileSync(path.join(tempDir, 'Dockerfile'), 'utf-8');
        expect(dockerfile).toContain(expectedBuilder);
        expect(dockerfile).toContain(expectedUser);

        logSpy.mockRestore();
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    },
  );
});
