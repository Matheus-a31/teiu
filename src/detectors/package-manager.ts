import fs from 'node:fs';
import path from 'node:path';

export type PackageManager = 'npm' | 'pnpm' | 'yarn';

export function detectPackageManager(rootDir: string): PackageManager {
  // 1. Checa por lockfiles
  if (fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (fs.existsSync(path.join(rootDir, 'yarn.lock'))) {
    return 'yarn';
  }

  if (fs.existsSync(path.join(rootDir, 'package-lock.json'))) {
    return 'npm';
  }

  // 2. Checa o campo "packageManager" no package.json (Corepack)
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (typeof pkg.packageManager === 'string') {
        if (pkg.packageManager.startsWith('pnpm')) return 'pnpm';
        if (pkg.packageManager.startsWith('yarn')) return 'yarn';
        if (pkg.packageManager.startsWith('npm')) return 'npm';
      }
    } catch {
      // Ignora erro de JSON mal formatado
    }
  }

  // Fallback padrão de mercado
  return 'npm';
}
