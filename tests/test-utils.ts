import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { expect, vi } from 'vitest';
import type { Command } from 'commander';

export async function runCliCommand(
  createCmd: () => Command,
  cmdName: string,
  args: string[],
): Promise<string> {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    const cmd = createCmd();
    await cmd.parseAsync(['node', cmdName, ...args]);
    return logSpy.mock.calls.map((c) => c[0]).join('\n');
  } finally {
    logSpy.mockRestore();
  }
}

export async function withTempDir(
  prefix: string,
  fn: (tempDir: string) => Promise<void> | void,
): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    await fn(tempDir);
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

export function assertFilesExist(dir: string, files: string[]): void {
  for (const file of files) {
    expect(fs.existsSync(path.join(dir, file))).toBe(true);
  }
}

export function readTextFile(dir: string, file: string): string {
  return fs.readFileSync(path.join(dir, file), 'utf-8');
}
