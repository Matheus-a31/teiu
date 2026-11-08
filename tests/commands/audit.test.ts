import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { createAuditCommand } from '../../src/commands/audit.js';
import { runCliCommand, withTempDir, readTextFile } from '../test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('Command: audit', () => {
  it('should audit bad Dockerfile and display issues and score in visual output', async () => {
    const fixtureDir = path.join(fixturesDir, 'audit-bad-docker');
    const output = await runCliCommand(createAuditCommand, 'audit', [fixtureDir]);

    expect(output).toContain('Auditando infraestrutura...');
    expect(output).toContain('Dockerfile');
    expect(output).toContain('Score:');
    expect(output).toContain('Sugestões:');
    expect(output).toContain('Sem multi-stage build');
    expect(output).toContain('Executando como root');
  });

  it('should support JSON output in audit command', async () => {
    const fixtureDir = path.join(fixturesDir, 'audit-bad-docker');
    const output = await runCliCommand(createAuditCommand, 'audit', [fixtureDir, '--json']);
    const parsed = JSON.parse(output);

    expect(parsed).toHaveProperty('score');
    expect(parsed).toHaveProperty('status');
    expect(parsed.status).toBe('critical');
    expect(parsed.summary.failed).toBeGreaterThanOrEqual(4);
    expect(parsed.dockerfile.exists).toBe(true);
    expect(parsed.suggestions.length).toBeGreaterThanOrEqual(4);
  });

  it('should support --fix flag to automatically regenerate optimized Dockerfile', async () => {
    await withTempDir('teiu-audit-fix-', async (tempDir) => {
      // Copia projeto Spring com Dockerfile ruim
      fs.cpSync(path.join(fixturesDir, 'spring-maven'), tempDir, { recursive: true });
      fs.copyFileSync(
        path.join(fixturesDir, 'audit-bad-docker', 'Dockerfile'),
        path.join(tempDir, 'Dockerfile'),
      );

      // Executa teiu audit --fix --yes
      await runCliCommand(createAuditCommand, 'audit', [tempDir, '--fix', '--yes']);

      const dockerfile = readTextFile(tempDir, 'Dockerfile');
      expect(dockerfile).toContain('AS builder');
      expect(dockerfile).toContain('USER app');
      expect(dockerfile).toContain('HEALTHCHECK');

      expect(fs.existsSync(path.join(tempDir, '.dockerignore'))).toBe(true);

      // Re-audita para validar novo score elevado
      const reAuditOutput = await runCliCommand(createAuditCommand, 'audit', [tempDir, '--json']);
      const reAudit = JSON.parse(reAuditOutput);
      expect(reAudit.score).toBe(10);
      expect(reAudit.status).toBe('excellent');
    });
  });
});
