import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCiCommand } from '../../src/commands/ci.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

async function executeCiCommand(args: string[]): Promise<string> {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    const cmd = createCiCommand();
    await cmd.parseAsync(['node', 'ci', ...args]);
    return logSpy.mock.calls.map((c) => c[0]).join('\n');
  } finally {
    logSpy.mockRestore();
  }
}

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
    const output = await executeCiCommand([fixtureDir, '--dry-run']);

    expect(output).toContain('name: CI / CD');
    expect(output).toContain('actions/setup-java@v4');
  });

  it('should support JSON output in ci command', async () => {
    const fixtureDir = path.join(fixturesDir, 'nest-npm');
    const output = await executeCiCommand([fixtureDir, '--dry-run', '--json']);
    const parsed = JSON.parse(output);

    expect(parsed.dryRun).toBe(true);
    expect(parsed.targetPath).toBe('.github/workflows/ci.yml');
    expect(parsed.content).toContain('actions/setup-node@v4');
  });

  it('should notify when gitlab provider is chosen', async () => {
    const fixtureDir = path.join(fixturesDir, 'spring-maven');
    const output = await executeCiCommand([fixtureDir, '--provider', 'gitlab', '--json']);
    const parsed = JSON.parse(output);

    expect(parsed.status).toBe('unsupported');
    expect(parsed.provider).toBe('gitlab');
  });

  it('should write .github/workflows/ci.yml file when running command', async () => {
    fs.cpSync(path.join(fixturesDir, 'spring-maven'), tempDir, { recursive: true });

    await executeCiCommand([tempDir, '--registry', 'ghcr', '--yes']);

    const workflowPath = path.join(tempDir, '.github/workflows/ci.yml');
    expect(fs.existsSync(workflowPath)).toBe(true);

    const content = fs.readFileSync(workflowPath, 'utf-8');
    expect(content).toContain('name: CI / CD');
    expect(content).toContain('ghcr.io');
    expect(content).toContain('mvnw clean verify');
  });
});
