import path from 'node:path';
import process from 'node:process';
import type { ProjectInfo } from '../types/project.js';
import { detectSpring } from './spring.js';
import { detectPortAndHealth } from './port.js';
import { detectExistingFiles } from './existing-files.js';

export * from './spring.js';
export * from './port.js';
export * from './existing-files.js';

export function detectProject(rootDir: string = process.cwd()): ProjectInfo | null {
  const resolvedDir = path.resolve(rootDir);

  // 1. Tenta detectar Spring Boot (Fase 1 / Sprint 1)
  const springResult = detectSpring(resolvedDir);
  if (springResult.isSpring && springResult.details) {
    const { port, healthPath } = detectPortAndHealth(resolvedDir);
    const existing = detectExistingFiles(resolvedDir);

    return {
      stack: 'spring',
      rootDir: resolvedDir,
      port,
      healthPath,
      hasTests: springResult.hasTests,
      testFrameworks: springResult.testFrameworks,
      spring: springResult.details,
      existing,
    };
  }

  // Futuras stacks (Sprint 2: NestJS) serão verificadas aqui

  return null;
}

