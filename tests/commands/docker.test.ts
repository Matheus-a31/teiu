import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { createDockerCommand } from '../../src/commands/docker.js';
import { runCliCommand, withTempDir, readTextFile } from '../test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('Command: docker', () => {
  it('should support dry-run mode without creating files', async () => {
    const output = await runCliCommand(createDockerCommand, 'docker', [
      '--dry-run',
      '--dir',
      path.join(fixturesDir, 'spring-maven'),
    ]);

    expect(output).toBeDefined();
  });

  it('should support JSON output in docker command', async () => {
    const output = await runCliCommand(createDockerCommand, 'docker', [
      '--dry-run',
      '--json',
      '--dir',
      path.join(fixturesDir, 'spring-maven'),
    ]);
    const parsed = JSON.parse(output);

    expect(parsed.success).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.results.length).toBe(2);
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
      await withTempDir('teiu-cmd-docker-', async (tempDir) => {
        fs.cpSync(path.join(fixturesDir, fixture), tempDir, { recursive: true });

        await runCliCommand(createDockerCommand, 'docker', ['--yes', '--dir', tempDir]);

        expect(fs.existsSync(path.join(tempDir, 'Dockerfile'))).toBe(true);
        expect(fs.existsSync(path.join(tempDir, '.dockerignore'))).toBe(true);

        const dockerfile = readTextFile(tempDir, 'Dockerfile');
        expect(dockerfile).toContain(expectedBuilder);
        expect(dockerfile).toContain(expectedUser);
      });
    },
  );
});
