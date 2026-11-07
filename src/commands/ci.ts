import path from 'node:path';
import process from 'node:process';
import { Command } from 'commander';
import { detectProject } from '../detectors/index.js';
import { generateGithubWorkflow } from '../generators/ci/github.js';
import { writeFileWithPolicy, type WriteFileResult } from '../core/file-writer.js';
import { logger } from '../core/logger.js';

export interface CiCommandOptions {
  dir?: string;
  provider?: string;
  registry?: 'ghcr' | 'dockerhub' | 'ecr';
  force?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  json?: boolean;
}

export function createCiCommand(): Command {
  const command = new Command('ci');

  command
    .description('Gera pipeline de CI/CD para seu projeto (GitHub Actions)')
    .argument('[caminho]', 'Diretório do projeto')
    .option('-d, --dir <caminho>', 'Diretório raiz do projeto', process.cwd())
    .option(
      '-p, --provider <provider>',
      'Provider de CI/CD (github | gitlab)',
      'github',
    )
    .option(
      '-r, --registry <registry>',
      'Container Registry para push da imagem (ghcr | dockerhub | ecr)',
      'ghcr',
    )
    .option('-f, --force', 'Sobrescreve pipeline existente sem confirmação', false)
    .option('--dry-run', 'Exibe o pipeline gerado no terminal sem salvar no disco', false)
    .option('-y, --yes', 'Não interativo, aceita respostas recomendadas', false)
    .option('--json', 'Saída estruturada em JSON', false)
    .action(async (caminho: string | undefined, options: CiCommandOptions) => {
      const targetDir = path.resolve(caminho || options.dir || process.cwd());

      let project;
      try {
        project = detectProject(targetDir);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (options.json) {
          console.log(JSON.stringify({ error: errorMsg, status: 'error' }, null, 2));
          process.exitCode = 1;
          return;
        }
        logger.error(`Erro ao detectar stack do projeto: ${errorMsg}`);
        process.exitCode = 1;
        return;
      }

      if (!project) {
        if (options.json) {
          console.log(JSON.stringify({ error: 'Nenhum projeto suportado detectado.', status: 'error' }, null, 2));
        } else {
          logger.error('Nenhum projeto suportado detectado para geração do CI.');
        }
        process.exitCode = 1;
        return;
      }

      const provider = (options.provider || 'github').toLowerCase();

      if (provider === 'gitlab') {
        const msg =
          'O suporte ao GitLab CI está planejado para o release v0.2. Atualmente, o Teiú suporta GitHub Actions.';
        if (options.json) {
          console.log(
            JSON.stringify({ error: msg, provider: 'gitlab', status: 'unsupported' }, null, 2),
          );
          return;
        }
        logger.warn(msg);
        return;
      }

      if (provider !== 'github') {
        const msg = `Provider de CI não suportado: ${provider}. Opções válidas: github, gitlab.`;
        if (options.json) {
          console.log(JSON.stringify({ error: msg, status: 'error' }, null, 2));
          process.exitCode = 1;
          return;
        }
        logger.error(msg);
        process.exitCode = 1;
        return;
      }

      const registry = options.registry || 'ghcr';
      const generated = generateGithubWorkflow(project, { registry });
      const fullTargetPath = path.join(targetDir, generated.targetPath);

      if (options.dryRun) {
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                dryRun: true,
                targetPath: generated.targetPath,
                fullPath: fullTargetPath,
                content: generated.content,
              },
              null,
              2,
            ),
          );
          return;
        }

        logger.info(`[dry-run] Pipeline GitHub Actions (${generated.targetPath}):\n`);
        console.log(generated.content);
        return;
      }

      const writeResult: WriteFileResult = writeFileWithPolicy(
        fullTargetPath,
        generated.content,
        {
          dryRun: options.dryRun,
          force: options.force,
          backup: true,
        },
      );

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              status: writeResult.status,
              targetPath: generated.targetPath,
              fullPath: fullTargetPath,
              backupPath: writeResult.backupPath,
              provider: 'github',
              registry,
            },
            null,
            2,
          ),
        );
        return;
      }

      if (writeResult.status === 'created' || writeResult.status === 'updated') {
        logger.success(writeResult.message);
        if (writeResult.backupPath) {
          logger.info(`Backup salvo em: ${path.relative(targetDir, writeResult.backupPath)}`);
        }
      } else if (writeResult.status === 'identical') {
        logger.info(writeResult.message);
      } else {
        logger.warn(writeResult.message);
      }
    });

  return command;
}
