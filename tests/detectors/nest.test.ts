import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { detectNest } from '../../src/detectors/nest.js';

describe('Detector: NestJS', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('should detect NestJS with npm', () => {
    const result = detectNest(path.join(fixturesDir, 'nest-npm'));

    expect(result.isNest).toBe(true);
    expect(result.details).toBeDefined();
    expect(result.details?.packageManager).toBe('npm');
    expect(result.details?.nodeVersion).toBe('20');
    expect(result.details?.buildDir).toBe('dist');
    expect(result.details?.entryFile).toBe('dist/main.js');
    expect(result.hasTests).toBe(true);
    expect(result.testFrameworks).toContain('Jest');
    expect(result.testFrameworks).toContain('Supertest');
  });

  it('should detect NestJS with pnpm', () => {
    const result = detectNest(path.join(fixturesDir, 'nest-pnpm'));

    expect(result.isNest).toBe(true);
    expect(result.details?.packageManager).toBe('pnpm');
    expect(result.details?.nodeVersion).toBe('>=20.0.0');
    expect(result.testFrameworks).toContain('Vitest');
  });

  it('should detect NestJS with yarn', () => {
    const result = detectNest(path.join(fixturesDir, 'nest-yarn'));

    expect(result.isNest).toBe(true);
    expect(result.details?.packageManager).toBe('yarn');
    expect(result.details?.nodeVersion).toBe('18.19.0');
  });

  it('should return isNest: false for non-nest directories', () => {
    const result = detectNest(path.join(fixturesDir, 'spring-maven'));
    expect(result.isNest).toBe(false);
    expect(result.details).toBeUndefined();
  });
});
