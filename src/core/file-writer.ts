import fs from 'node:fs';
import path from 'node:path';

export interface WriteFileOptions {
  dryRun?: boolean;
  force?: boolean;
  backup?: boolean;
}

export type WriteStatus = 'created' | 'updated' | 'identical' | 'skipped';

export interface WriteFileResult {
  filePath: string;
  fileName: string;
  status: WriteStatus;
  backupPath?: string;
  message: string;
}

export function writeFileWithPolicy(
  targetPath: string,
  content: string,
  options: WriteFileOptions = {},
): WriteFileResult {
  const resolvedPath = path.resolve(targetPath);
  const fileName = path.basename(resolvedPath);
  const { dryRun = false, force = false, backup = true } = options;

  // 1. Modo Dry-Run (apenas simulação)
  if (dryRun) {
    const exists = fs.existsSync(resolvedPath);
    return {
      filePath: resolvedPath,
      fileName,
      status: 'skipped',
      message: exists
        ? `[dry-run] O arquivo ${fileName} seria atualizado`
        : `[dry-run] O arquivo ${fileName} seria criado`,
    };
  }

  // 2. Arquivo não existe: cria diretamente
  if (!fs.existsSync(resolvedPath)) {
    const parentDir = path.dirname(resolvedPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(resolvedPath, content, 'utf-8');
    return {
      filePath: resolvedPath,
      fileName,
      status: 'created',
      message: `Arquivo ${fileName} criado com sucesso`,
    };
  }

  // 3. Arquivo já existe: checa idempotência
  const currentContent = fs.readFileSync(resolvedPath, 'utf-8');
  if (currentContent === content) {
    return {
      filePath: resolvedPath,
      fileName,
      status: 'identical',
      message: `Arquivo ${fileName} já está atualizado (idêntico)`,
    };
  }

  // 4. Arquivo existe com conteúdo diferente: requer force
  if (!force) {
    return {
      filePath: resolvedPath,
      fileName,
      status: 'skipped',
      message: `Arquivo ${fileName} já existe. Use --force para sobrescrever`,
    };
  }

  // 5. Sobrescrita com backup
  let backupPath: string | undefined;
  if (backup) {
    backupPath = `${resolvedPath}.teiu-backup`;
    fs.copyFileSync(resolvedPath, backupPath);
  }

  fs.writeFileSync(resolvedPath, content, 'utf-8');

  const backupNote = backupPath ? ` (backup salvo em ${path.basename(backupPath)})` : '';
  return {
    filePath: resolvedPath,
    fileName,
    status: 'updated',
    backupPath,
    message: `Arquivo ${fileName} sobrescrito${backupNote}`,
  };
}
