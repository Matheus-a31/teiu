import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileWithPolicy } from '../../src/core/file-writer.js';

describe('Core: File Writer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teiu-test-writer-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should create a new file successfully', () => {
    const target = path.join(tempDir, 'Dockerfile');
    const result = writeFileWithPolicy(target, 'FROM alpine');

    expect(result.status).toBe('created');
    expect(fs.existsSync(target)).toBe(true);
    expect(fs.readFileSync(target, 'utf-8')).toBe('FROM alpine');
  });

  it('should not write file in dryRun mode', () => {
    const target = path.join(tempDir, 'Dockerfile');
    const result = writeFileWithPolicy(target, 'FROM alpine', { dryRun: true });

    expect(result.status).toBe('skipped');
    expect(fs.existsSync(target)).toBe(false);
  });

  it('should detect identical content and skip (idempotency)', () => {
    const target = path.join(tempDir, 'Dockerfile');
    writeFileWithPolicy(target, 'FROM alpine');

    const result2 = writeFileWithPolicy(target, 'FROM alpine');
    expect(result2.status).toBe('identical');
  });

  it('should not overwrite existing file without force flag', () => {
    const target = path.join(tempDir, 'Dockerfile');
    writeFileWithPolicy(target, 'FROM alpine');

    const result2 = writeFileWithPolicy(target, 'FROM ubuntu');
    expect(result2.status).toBe('skipped');
    expect(fs.readFileSync(target, 'utf-8')).toBe('FROM alpine');
  });

  it('should overwrite existing file and create backup when force is true', () => {
    const target = path.join(tempDir, 'Dockerfile');
    writeFileWithPolicy(target, 'FROM alpine');

    const result = writeFileWithPolicy(target, 'FROM ubuntu', { force: true, backup: true });
    expect(result.status).toBe('updated');
    expect(fs.readFileSync(target, 'utf-8')).toBe('FROM ubuntu');

    const backupFile = `${target}.teiu-backup`;
    expect(fs.existsSync(backupFile)).toBe(true);
    expect(fs.readFileSync(backupFile, 'utf-8')).toBe('FROM alpine');
  });
});
