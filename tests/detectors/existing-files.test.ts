import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { describe, it, expect } from 'vitest';
import { detectExistingFiles } from '../../src/detectors/existing-files.js';

describe('Detector: Existing Files', () => {
  it('should detect when no infra files exist', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teiu-test-infra-none-'));
    const result = detectExistingFiles(tempDir);

    expect(result.dockerfile).toBe(false);
    expect(result.compose).toBe(false);
    expect(result.ci).toBe(false);
    expect(result.ciProvider).toBeUndefined();

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should detect Dockerfile, docker-compose and GitHub Actions workflows', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teiu-test-infra-all-'));
    fs.writeFileSync(path.join(tempDir, 'Dockerfile'), 'FROM eclipse-temurin:21');
    fs.writeFileSync(path.join(tempDir, 'docker-compose.yml'), 'services:');

    const workflowsDir = path.join(tempDir, '.github', 'workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), 'name: CI');

    const result = detectExistingFiles(tempDir);
    expect(result.dockerfile).toBe(true);
    expect(result.compose).toBe(true);
    expect(result.ci).toBe(true);
    expect(result.ciProvider).toBe('github');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should detect GitLab CI', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teiu-test-infra-gitlab-'));
    fs.writeFileSync(path.join(tempDir, '.gitlab-ci.yml'), 'stages:');

    const result = detectExistingFiles(tempDir);
    expect(result.ci).toBe(true);
    expect(result.ciProvider).toBe('gitlab');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
