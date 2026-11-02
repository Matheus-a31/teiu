import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { detectProject } from '../../src/detectors/index.js';
import { generateSpringDocker } from '../../src/generators/docker/spring.js';

describe('Generator: Spring Dockerfile & .dockerignore', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('should generate multi-stage Dockerfile for Spring Maven', () => {
    const info = detectProject(path.join(fixturesDir, 'spring-maven'));
    expect(info).not.toBeNull();

    const result = generateSpringDocker(info!);

    expect(result.dockerfile).toContain('FROM eclipse-temurin:21-jdk-alpine AS builder');
    expect(result.dockerfile).toContain('FROM eclipse-temurin:21-jre-alpine AS runtime');
    expect(result.dockerfile).toContain('./mvnw dependency:go-offline');
    expect(result.dockerfile).toContain('RUN addgroup -S app && adduser -S app -G app');
    expect(result.dockerfile).toContain('USER app');
    expect(result.dockerfile).toContain('EXPOSE 8080');
    expect(result.dockerfile).toContain('HEALTHCHECK');
    expect(result.dockerfile).toContain('/actuator/health');

    expect(result.dockerignore).toContain('.git');
    expect(result.dockerignore).toContain('target/');

    // Snapshot test
    expect(result.dockerfile).toMatchSnapshot();
  });

  it('should generate multi-stage Dockerfile for Spring Gradle', () => {
    const info = detectProject(path.join(fixturesDir, 'spring-gradle'));
    expect(info).not.toBeNull();

    const result = generateSpringDocker(info!);

    expect(result.dockerfile).toContain('FROM eclipse-temurin:17-jdk-alpine AS builder');
    expect(result.dockerfile).toContain('FROM eclipse-temurin:17-jre-alpine AS runtime');
    expect(result.dockerfile).toContain('./gradlew dependencies');
    expect(result.dockerfile).toContain('EXPOSE 9090');

    expect(result.dockerfile).toMatchSnapshot();
  });

  it('should generate multi-stage Dockerfile for Spring Kotlin', () => {
    const info = detectProject(path.join(fixturesDir, 'spring-kotlin'));
    expect(info).not.toBeNull();

    const result = generateSpringDocker(info!);

    expect(result.dockerfile).toContain('FROM eclipse-temurin:21-jdk-alpine AS builder');
    expect(result.dockerfile).toContain('build.gradle.kts');
    expect(result.dockerfile).toContain('EXPOSE 8081');

    expect(result.dockerfile).toMatchSnapshot();
  });

  it('should allow custom base image for runtime', () => {
    const info = detectProject(path.join(fixturesDir, 'spring-maven'));
    const result = generateSpringDocker(info!, { baseImage: 'amazoncorretto:21-alpine' });

    expect(result.dockerfile).toContain('FROM amazoncorretto:21-alpine AS runtime');
  });
});
