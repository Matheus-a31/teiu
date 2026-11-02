import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { detectProject } from '../../src/detectors/index.js';
import {
  generateSpringDocker,
  type GenerateSpringDockerOptions,
} from '../../src/generators/docker/spring.js';

describe('Generator: Spring Dockerfile & .dockerignore', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  function generateForFixture(fixtureName: string, options: GenerateSpringDockerOptions = {}) {
    const info = detectProject(path.join(fixturesDir, fixtureName));
    expect(info).not.toBeNull();
    return generateSpringDocker(info!, options);
  }

  it.each([
    {
      fixture: 'spring-maven',
      jdk: '21',
      jre: '21',
      depCommand: './mvnw dependency:go-offline',
      port: '8080',
      extraChecks: (df: string, di: string) => {
        expect(df).toContain('RUN addgroup -S app && adduser -S app -G app');
        expect(df).toContain('USER app');
        expect(df).toContain('HEALTHCHECK');
        expect(df).toContain('/actuator/health');
        expect(di).toContain('.git');
        expect(di).toContain('target/');
      },
    },
    {
      fixture: 'spring-gradle',
      jdk: '17',
      jre: '17',
      depCommand: './gradlew dependencies',
      port: '9090',
      extraChecks: (df: string, _di: string) => {
        expect(df).toContain('USER app');
      },
    },
    {
      fixture: 'spring-kotlin',
      jdk: '21',
      jre: '21',
      depCommand: './gradlew dependencies',
      port: '8081',
      extraChecks: (df: string, _di: string) => {
        expect(df).toContain('build.gradle.kts');
      },
    },
  ])(
    'should generate multi-stage Dockerfile for $fixture',
    ({ fixture, jdk, jre, depCommand, port, extraChecks }) => {
      const result = generateForFixture(fixture);

      expect(result.dockerfile).toContain(`FROM eclipse-temurin:${jdk}-jdk-alpine AS builder`);
      expect(result.dockerfile).toContain(`FROM eclipse-temurin:${jre}-jre-alpine AS runtime`);
      expect(result.dockerfile).toContain(depCommand);
      expect(result.dockerfile).toContain(`EXPOSE ${port}`);

      extraChecks(result.dockerfile, result.dockerignore);
      expect(result.dockerfile).toMatchSnapshot();
    },
  );

  it('should allow custom base image for runtime', () => {
    const result = generateForFixture('spring-maven', { baseImage: 'amazoncorretto:21-alpine' });
    expect(result.dockerfile).toContain('FROM amazoncorretto:21-alpine AS runtime');
  });
});
