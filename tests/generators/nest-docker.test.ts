import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { detectProject } from '../../src/detectors/index.js';
import {
  generateNestDocker,
  type GenerateNestDockerOptions,
} from '../../src/generators/docker/nest.js';

describe('Generator: Nest Dockerfile & .dockerignore', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  function generateForNestFixture(fixtureName: string, options: GenerateNestDockerOptions = {}) {
    const info = detectProject(path.join(fixturesDir, fixtureName));
    expect(info).not.toBeNull();
    return generateNestDocker(info!, options);
  }

  it.each([
    {
      fixture: 'nest-npm',
      nodeVersion: '20',
      installCmd: 'npm ci',
      buildCmd: 'npm run build',
      pruneCmd: 'npm prune --omit=dev',
      port: '3000',
    },
    {
      fixture: 'nest-pnpm',
      nodeVersion: '20',
      installCmd: 'pnpm install --frozen-lockfile',
      buildCmd: 'pnpm run build',
      pruneCmd: 'pnpm prune --prod',
      port: '4000',
    },
    {
      fixture: 'nest-yarn',
      nodeVersion: '18',
      installCmd: 'yarn install --frozen-lockfile',
      buildCmd: 'yarn build',
      pruneCmd: 'yarn install --production --ignore-scripts --prefer-offline',
      port: '3001',
    },
  ])(
    'should generate multi-stage Dockerfile for $fixture',
    ({ fixture, nodeVersion, installCmd, buildCmd, pruneCmd, port }) => {
      const result = generateForNestFixture(fixture);

      expect(result.dockerfile).toContain(`FROM node:${nodeVersion}-alpine AS deps`);
      expect(result.dockerfile).toContain(`FROM node:${nodeVersion}-alpine AS builder`);
      expect(result.dockerfile).toContain(`FROM node:${nodeVersion}-alpine AS runtime`);
      expect(result.dockerfile).toContain(installCmd);
      expect(result.dockerfile).toContain(buildCmd);
      expect(result.dockerfile).toContain(pruneCmd);
      expect(result.dockerfile).toContain('USER node');
      expect(result.dockerfile).toContain(`EXPOSE ${port}`);
      expect(result.dockerfile).toContain('HEALTHCHECK');
      expect(result.dockerfile).toContain('CMD ["node", "dist/main.js"]');

      expect(result.dockerignore).toContain('.git');
      expect(result.dockerignore).toContain('node_modules/');

      expect(result.dockerfile).toMatchSnapshot();
    },
  );

  it('should allow custom base image for NestJS runtime', () => {
    const result = generateForNestFixture('nest-npm', { baseImage: 'node:20-slim' });
    expect(result.dockerfile).toContain('FROM node:20-slim AS runtime');
  });

  it('should throw error if project is not nest', () => {
    const info = detectProject(path.join(fixturesDir, 'spring-maven'));
    expect(() => generateNestDocker(info!)).toThrow('O projeto informado não é do tipo NestJS.');
  });
});
