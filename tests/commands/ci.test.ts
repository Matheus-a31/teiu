import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { createCiCommand } from '../../src/commands/ci.js';
import { runCliCommand, withTempDir } from '../test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('Command: ci', () => {
  it('should support dry-run mode without creating files', async () => {
    const fixtureDir = path.join(fixturesDir, 'spring-maven');
    const output = await runCliCommand(createCiCommand, 'ci', [fixtureDir, '--dry-run']);

    expect(output).toContain('name: CI / CD');
    expect(output).toContain('actions/setup-java@v4');
  });

  it('should support JSON output in ci command', async () => {
    const fixtureDir = path.join(fixturesDir, 'nest-npm');
    const output = await runCliCommand(createCiCommand, 'ci', [fixtureDir, '--dry-run', '--json']);
    const parsed = JSON.parse(output);

    expect(parsed.dryRun).toBe(true);
    expect(parsed.targetPath).toBe('.github/workflows/ci.yml');
    expect(parsed.content).toContain('actions/setup-node@v4');
  });

  it('should notify when gitlab provider is chosen', async () => {
    const fixtureDir = path.join(fixturesDir, 'spring-maven');
    const output = await runCliCommand(createCiCommand, 'ci', [
      fixtureDir,
      '--provider',
      'gitlab',
      '--json',
    ]);
    const parsed = JSON.parse(output);

    expect(parsed.status).toBe('unsupported');
    expect(parsed.provider).toBe('gitlab');
  });

  it('should write .github/workflows/ci.yml file when running command', async () => {
    await withTempDir('teiu-ci-test-', async (tempDir) => {
      fs.cpSync(path.join(fixturesDir, 'spring-maven'), tempDir, { recursive: true });

      await runCliCommand(createCiCommand, 'ci', [tempDir, '--registry', 'ghcr', '--yes']);

      const workflowPath = path.join(tempDir, '.github/workflows/ci.yml');
      expect(fs.existsSync(workflowPath)).toBe(true);

      const content = fs.readFileSync(workflowPath, 'utf-8');
      expect(content).toContain('name: CI / CD');
      expect(content).toContain('ghcr.io');
      expect(content).toContain('mvnw clean verify');
    });
  });
});
