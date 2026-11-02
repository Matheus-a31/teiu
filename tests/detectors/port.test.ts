import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { detectPortAndHealth } from '../../src/detectors/port.js';

describe('Detector: Port & Health', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('should detect port 8080 from application.yml in spring-maven', () => {
    const result = detectPortAndHealth(path.join(fixturesDir, 'spring-maven'), 'spring');
    expect(result.port).toBe(8080);
    expect(result.healthPath).toBe('/actuator/health');
  });

  it('should detect port 9090 from application.properties in spring-gradle', () => {
    const result = detectPortAndHealth(path.join(fixturesDir, 'spring-gradle'), 'spring');
    expect(result.port).toBe(9090);
    expect(result.healthPath).toBe('/actuator/health');
  });

  it('should detect port 8081 from application.yml in spring-kotlin', () => {
    const result = detectPortAndHealth(path.join(fixturesDir, 'spring-kotlin'), 'spring');
    expect(result.port).toBe(8081);
    expect(result.healthPath).toBe('/actuator/health');
  });

  it('should detect port 3000 from main.ts in nest-npm', () => {
    const result = detectPortAndHealth(path.join(fixturesDir, 'nest-npm'), 'nest');
    expect(result.port).toBe(3000);
    expect(result.healthPath).toBe('/health');
  });

  it('should detect port 4000 from .env in nest-pnpm', () => {
    const result = detectPortAndHealth(path.join(fixturesDir, 'nest-pnpm'), 'nest');
    expect(result.port).toBe(4000);
    expect(result.healthPath).toBe('/health');
  });

  it('should detect port 3001 from main.ts in nest-yarn', () => {
    const result = detectPortAndHealth(path.join(fixturesDir, 'nest-yarn'), 'nest');
    expect(result.port).toBe(3001);
    expect(result.healthPath).toBe('/health');
  });

  it('should fallback to defaults when no configuration exists', () => {
    const resultSpring = detectPortAndHealth(fixturesDir, 'spring');
    expect(resultSpring.port).toBe(8080);
    expect(resultSpring.healthPath).toBe('/actuator/health');

    const resultNest = detectPortAndHealth(fixturesDir, 'nest');
    expect(resultNest.port).toBe(3000);
    expect(resultNest.healthPath).toBe('/health');
  });
});
