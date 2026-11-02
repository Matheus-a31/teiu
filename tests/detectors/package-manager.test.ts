import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { detectPackageManager } from '../../src/detectors/package-manager.js';

describe('Detector: Package Manager', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('should detect npm when package-lock.json exists', () => {
    const pm = detectPackageManager(path.join(fixturesDir, 'nest-npm'));
    expect(pm).toBe('npm');
  });

  it('should detect pnpm when pnpm-lock.yaml exists', () => {
    const pm = detectPackageManager(path.join(fixturesDir, 'nest-pnpm'));
    expect(pm).toBe('pnpm');
  });

  it('should detect yarn when yarn.lock exists', () => {
    const pm = detectPackageManager(path.join(fixturesDir, 'nest-yarn'));
    expect(pm).toBe('yarn');
  });

  it('should fallback to npm when no lockfile exists', () => {
    const pm = detectPackageManager(fixturesDir);
    expect(pm).toBe('npm');
  });
});
