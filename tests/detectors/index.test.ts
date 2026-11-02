import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { detectProject } from '../../src/detectors/index.js';

describe('Detector: Orchestrator (detectProject)', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('should assemble full ProjectInfo for Maven Spring Boot', () => {
    const info = detectProject(path.join(fixturesDir, 'spring-maven'));

    expect(info).not.toBeNull();
    expect(info?.stack).toBe('spring');
    expect(info?.port).toBe(8080);
    expect(info?.healthPath).toBe('/actuator/health');
    expect(info?.hasTests).toBe(true);
    expect(info?.spring?.bootVersion).toBe('3.2.1');
    expect(info?.spring?.javaVersion).toBe('21');
    expect(info?.spring?.buildTool).toBe('maven');
    expect(info?.existing.dockerfile).toBe(false);
  });

  it('should return null for directory with no supported stack', () => {
    const info = detectProject(fixturesDir);
    expect(info).toBeNull();
  });
});

