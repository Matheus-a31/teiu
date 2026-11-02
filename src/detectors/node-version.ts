import fs from 'node:fs';
import path from 'node:path';

export function detectNodeVersion(rootDir: string): string {
  // 1. Checa .nvmrc
  const nvmrcPath = path.join(rootDir, '.nvmrc');
  if (fs.existsSync(nvmrcPath)) {
    try {
      const content = fs.readFileSync(nvmrcPath, 'utf-8').trim();
      if (content) {
        return content.replace(/^v/, '');
      }
    } catch {
      // Ignora erro
    }
  }

  // 2. Checa .node-version
  const nodeVersionPath = path.join(rootDir, '.node-version');
  if (fs.existsSync(nodeVersionPath)) {
    try {
      const content = fs.readFileSync(nodeVersionPath, 'utf-8').trim();
      if (content) {
        return content.replace(/^v/, '');
      }
    } catch {
      // Ignora erro
    }
  }

  // 3. Checa package.json -> engines.node
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.engines && typeof pkg.engines.node === 'string') {
        return pkg.engines.node.trim();
      }
    } catch {
      // Ignora erro
    }
  }

  // Fallback padrão exigido pelo Teiú (Node >= 18)
  return '>=18';
}
