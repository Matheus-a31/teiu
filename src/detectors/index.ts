import path from 'node:path';
import process from 'node:process';
import type { ProjectInfo } from '../types/project.js';
import { detectSpring, type SpringDetectionResult } from './spring.js';
import { detectNest, type NestDetectionResult } from './nest.js';
import { detectPortAndHealth } from './port.js';
import { detectExistingFiles } from './existing-files.js';

export * from './spring.js';
export * from './nest.js';
export * from './package-manager.js';
export * from './node-version.js';
export * from './port.js';
export * from './existing-files.js';

function buildSpringProjectInfo(rootDir: string, springResult: SpringDetectionResult): ProjectInfo {
  const { port, healthPath } = detectPortAndHealth(rootDir, 'spring');
  const existing = detectExistingFiles(rootDir);

  return {
    stack: 'spring',
    rootDir,
    port,
    healthPath,
    hasTests: springResult.hasTests,
    testFrameworks: springResult.testFrameworks,
    spring: springResult.details,
    existing,
  };
}

function buildNestProjectInfo(rootDir: string, nestResult: NestDetectionResult): ProjectInfo {
  const { port, healthPath } = detectPortAndHealth(rootDir, 'nest');
  const existing = detectExistingFiles(rootDir);

  return {
    stack: 'nest',
    rootDir,
    port,
    healthPath,
    hasTests: nestResult.hasTests,
    testFrameworks: nestResult.testFrameworks,
    nest: nestResult.details,
    existing,
  };
}

export function detectProject(
  rootDir: string = process.cwd(),
  preferredStack?: 'spring' | 'nest',
): ProjectInfo | null {
  const resolvedDir = path.resolve(rootDir);

  const springResult = detectSpring(resolvedDir);
  const nestResult = detectNest(resolvedDir);

  if (preferredStack === 'nest' && nestResult.isNest && nestResult.details) {
    return buildNestProjectInfo(resolvedDir, nestResult);
  }

  if (preferredStack === 'spring' && springResult.isSpring && springResult.details) {
    return buildSpringProjectInfo(resolvedDir, springResult);
  }

  // Detecção automática
  if (springResult.isSpring && springResult.details) {
    return buildSpringProjectInfo(resolvedDir, springResult);
  }

  if (nestResult.isNest && nestResult.details) {
    return buildNestProjectInfo(resolvedDir, nestResult);
  }

  return null;
}
