import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { detectPortAndHealth } from '../../src/detectors/port.js';

describe('Detector: Port & Health', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('should detect port 8080 from application.yml in spring-maven', () => {
    const result = detectPortAndHealth(path.join(fixturesDir, 'spring-maven'));
    expect(result.port).toBe(8080);
    expect(result.healthPath).toBe('/actuator/health');
  });

  it('should detect port 9090 from application.properties in spring-gradle', () => {
    const result = detectPortAndHealth(path.join(fixturesDir, 'spring-gradle'));
    expect(result.port).toBe(9090);
    expect(result.healthPath).toBe('/actuator/health');
  });

  it('should detect port 8081 from application.yml in spring-kotlin', () => {
    const result = detectPortAndHealth(path.join(fixturesDir, 'spring-kotlin'));
    expect(result.port).toBe(8081);
    expect(result.healthPath).toBe('/actuator/health');
  });

  it('should fallback to 8080 and /actuator/health when no configuration exists', () => {
    const result = detectPortAndHealth(fixturesDir);
    expect(result.port).toBe(8080);
    expect(result.healthPath).toBe('/actuator/health');
  });
});

