import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCiCommand } from '../../src/commands/ci.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('Command: ci', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teiu-ci-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should support dry-run mode without creating files', async () => {
    const fixtureDir = path.join(fixturesDir, 'spring-maven');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const cmd = createCiCommand();
    await cmd.parseAsync(['node', 'ci', fixtureDir, '--dry-run']);

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('name: CI / CD');
    expect(output).toContain('actions/setup-java@v4');

    logSpy.mockRestore();
  });

  it('should support JSON output in ci command', async () => {
    const fixtureDir = path.join(fixturesDir, 'nest-npm');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const cmd = createCiCommand();
    await cmd.parseAsync(['node', 'ci', fixtureDir, '--dry-run', '--json']);

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(output as string);

    expect(parsed.dryRun).toBe(true);
    expect(parsed.targetPath).toBe('.github/workflows/ci.yml');
    expect(parsed.content).toContain('actions/setup-node@v4');

    logSpy.mockRestore();
  });

  it('should notify when gitlab provider is chosen', async () => {
    const fixtureDir = path.join(fixturesDir, 'spring-maven');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const cmd = createCiCommand();
    await cmd.parseAsync(['node', 'ci', fixtureDir, '--provider', 'gitlab', '--json']);

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(output as string);

    expect(parsed.status).toBe('unsupported');
    expect(parsed.provider).toBe('gitlab');

    logSpy.mockRestore();
  });

  it('should write .github/workflows/ci.yml file when running command', async () => {
    // Copia fixture para pasta temporária
    const fixtureDir = path.join(fixturesDir, 'spring-maven');
    fs.cpSync(fixtureDir, tempDir, { recursive: true });

    const cmd = createCiCommand();
    await cmd.parseAsync(['node', 'ci', tempDir, '--registry', 'ghcr', '--yes']);

    const workflowPath = path.join(tempDir, '.github/workflows/ci.yml');
    expect(fs.existsSync(workflowPath)).toBe(true);

    const content = fs.readFileSync(workflowPath, 'utf-8');
    expect(content).toContain('name: CI / CD');
    expect(content).toContain('ghcr.io');
    expect(content).toContain('mvnw clean verify');
  });
});
