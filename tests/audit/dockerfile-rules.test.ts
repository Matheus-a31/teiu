import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { auditDockerfile } from '../../src/audit/dockerfile-rules.js';
import { readTextFile } from '../test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('Audit: Dockerfile Rules', () => {
  it('should detect multiple issues in a bad Dockerfile (done criterion: >= 4 issues)', () => {
    const badDir = path.join(fixturesDir, 'audit-bad-docker');
    const content = readTextFile(badDir, 'Dockerfile');

    const results = auditDockerfile({
      content,
      dockerfilePath: path.join(badDir, 'Dockerfile'),
      projectDir: badDir,
    });

    const failed = results.filter((r) => !r.passed);
    expect(failed.length).toBeGreaterThanOrEqual(4);

    const failedIds = failed.map((r) => r.id);
    expect(failedIds).toContain('DOCKER_MULTI_STAGE');
    expect(failedIds).toContain('DOCKER_NON_ROOT');
    expect(failedIds).toContain('DOCKER_HEALTHCHECK');
    expect(failedIds).toContain('DOCKER_DOCKERIGNORE');

    for (const issue of failed) {
      expect(issue.suggestion).toBeDefined();
    }
  });

  it('should pass all rules on an optimized Dockerfile', () => {
    const goodDir = path.join(fixturesDir, 'audit-good');
    const content = readTextFile(goodDir, 'Dockerfile');

    const results = auditDockerfile({
      content,
      dockerfilePath: path.join(goodDir, 'Dockerfile'),
      projectDir: goodDir,
    });

    const failed = results.filter((r) => !r.passed);
    expect(failed.length).toBe(0);
    expect(results.every((r) => r.passed)).toBe(true);
  });
});
