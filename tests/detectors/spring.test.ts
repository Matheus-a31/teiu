import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { detectSpring } from '../../src/detectors/spring.js';

describe('Detector: Spring Boot', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('should detect Spring Boot Maven fixture correctly', () => {
    const result = detectSpring(path.join(fixturesDir, 'spring-maven'));

    expect(result.isSpring).toBe(true);
    expect(result.details).toBeDefined();
    expect(result.details?.bootVersion).toBe('3.2.1');
    expect(result.details?.javaVersion).toBe('21');
    expect(result.details?.buildTool).toBe('maven');
    expect(result.details?.hasWrapper).toBe(true);
    expect(result.details?.artifactPath).toBe('target/*.jar');
    expect(result.details?.isKotlin).toBe(false);
    expect(result.hasTests).toBe(true);
    expect(result.testFrameworks).toContain('JUnit 5');
    expect(result.testFrameworks).toContain('Testcontainers');
  });

  it('should detect Spring Boot Gradle fixture correctly', () => {
    const result = detectSpring(path.join(fixturesDir, 'spring-gradle'));

    expect(result.isSpring).toBe(true);
    expect(result.details).toBeDefined();
    expect(result.details?.bootVersion).toBe('3.1.5');
    expect(result.details?.javaVersion).toBe('17');
    expect(result.details?.buildTool).toBe('gradle');
    expect(result.details?.hasWrapper).toBe(true);
    expect(result.details?.artifactPath).toBe('build/libs/*.jar');
    expect(result.details?.isKotlin).toBe(false);
    expect(result.hasTests).toBe(true);
    expect(result.testFrameworks).toContain('JUnit 5');
  });

  it('should detect Spring Boot Kotlin fixture with Gradle KTS correctly', () => {
    const result = detectSpring(path.join(fixturesDir, 'spring-kotlin'));

    expect(result.isSpring).toBe(true);
    expect(result.details).toBeDefined();
    expect(result.details?.bootVersion).toBe('3.2.0');
    expect(result.details?.javaVersion).toBe('21');
    expect(result.details?.buildTool).toBe('gradle');
    expect(result.details?.hasWrapper).toBe(true);
    expect(result.details?.artifactPath).toBe('build/libs/*.jar');
    expect(result.details?.isKotlin).toBe(true);
    expect(result.hasTests).toBe(true);
    expect(result.testFrameworks).toContain('JUnit 5');
    expect(result.testFrameworks).toContain('Testcontainers');
  });

  it('should return isSpring: false for non-spring directories', () => {
    const result = detectSpring(fixturesDir);
    expect(result.isSpring).toBe(false);
    expect(result.details).toBeUndefined();
  });
});
