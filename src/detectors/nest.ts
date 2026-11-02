import fs from 'node:fs';
import path from 'node:path';
import type { NestDetails } from '../types/project.js';
import { detectPackageManager } from './package-manager.js';
import { detectNodeVersion } from './node-version.js';

export interface NestDetectionResult {
  isNest: boolean;
  details?: NestDetails;
  hasTests: boolean;
  testFrameworks: string[];
}

export function detectNest(rootDir: string): NestDetectionResult {
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return {
      isNest: false,
      hasTests: false,
      testFrameworks: [],
    };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    const isNest = Boolean(allDeps['@nestjs/core']);
    if (!isNest) {
      return {
        isNest: false,
        hasTests: false,
        testFrameworks: [],
      };
    }

    const packageManager = detectPackageManager(rootDir);
    const nodeVersion = detectNodeVersion(rootDir);

    // Detecção de testes
    const testDir = path.join(rootDir, 'test');
    const hasTestDir = fs.existsSync(testDir);
    const hasTestDeps = Boolean(allDeps['@nestjs/testing'] || allDeps['jest'] || allDeps['vitest']);
    const hasTests = hasTestDir || hasTestDeps;

    const testFrameworks: string[] = [];
    if (allDeps['jest'] || allDeps['@nestjs/testing']) {
      testFrameworks.push('Jest');
    }
    if (allDeps['supertest']) {
      testFrameworks.push('Supertest');
    }
    if (allDeps['vitest']) {
      testFrameworks.push('Vitest');
    }

    return {
      isNest: true,
      details: {
        nodeVersion,
        packageManager,
        buildDir: 'dist',
        entryFile: 'dist/main.js',
      },
      hasTests,
      testFrameworks,
    };
  } catch {
    return {
      isNest: false,
      hasTests: false,
      testFrameworks: [],
    };
  }
}
