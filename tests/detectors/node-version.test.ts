import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { detectNodeVersion } from '../../src/detectors/node-version.js';

describe('Detector: Node Version', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('should detect node version from .nvmrc', () => {
    const version = detectNodeVersion(path.join(fixturesDir, 'nest-npm'));
    expect(version).toBe('20');
  });

  it('should detect node version from engines field in package.json', () => {
    const version = detectNodeVersion(path.join(fixturesDir, 'nest-pnpm'));
    expect(version).toBe('>=20.0.0');
  });

  it('should detect node version from .node-version', () => {
    const version = detectNodeVersion(path.join(fixturesDir, 'nest-yarn'));
    expect(version).toBe('18.19.0');
  });

  it('should fallback to >=18 when no node version configuration exists', () => {
    const version = detectNodeVersion(fixturesDir);
    expect(version).toBe('>=18');
  });
});
