import path from 'node:path';
import process from 'node:process';
import { Command } from 'commander';
import * as p from '@clack/prompts';
import { detectProject } from '../detectors/index.js';
import { generateSpringDocker } from '../generators/docker/spring.js';
import { writeFileWithPolicy, type WriteFileResult } from '../core/file-writer.js';
import { logger, colors } from '../core/logger.js';

export interface DockerCommandOptions {
  dir: string;
  dryRun?: boolean;
  force?: boolean;
  yes?: boolean;
  baseImage?: string;
  json?: boolean;
}

export function createDockerCommand(): Command {
  const docker = new Command('docker');

  docker
    .description('Gera Dockerfile multi-stage otimizado e .dockerignore para o projeto')
    .option('-d, --dir <caminho>', 'Diretório raiz do projeto', process.cwd())
    .option('--dry-run', 'Simula a geração sem escrever arquivos no disco')
    .option('--force', 'Sobrescreve arquivos existentes criando backup automático')
    .option('-y, --yes', 'Pula confirmações e aceita os padrões')
    .option('--base-image <imagem>', 'Imagem base customizada para a etapa de runtime')
    .option('--json', 'Retorna o resultado da operação em formato JSON')
    .action(async (options: DockerCommandOptions) => {
      const targetDir = path.resolve(options.dir);
      const info = detectProject(targetDir);

      if (!info) {
        if (options.json) {
          console.log(JSON.stringify({ error: 'Nenhum projeto suportado detectado.' }, null, 2));
        } else {
          logger.error('Nenhum projeto suportado detectado para geração do Dockerfile.');
        }
        process.exitCode = 1;
        return;
      }

      if (info.stack !== 'spring') {
        const msg = 'Geração de Dockerfile para esta stack será liberada nos próximos sprints.';
        if (options.json) {
          console.log(JSON.stringify({ error: msg }, null, 2));
        } else {
          logger.warn(msg);
        }
        return;
      }

      // Gera os arquivos na memória
      const generated = generateSpringDocker(info, { baseImage: options.baseImage });

      // Se não for --yes nem --json nem --dry-run, pede confirmação
      if (!options.yes && !options.json && !options.dryRun) {
        p.intro(colors.primary('🦎 Teiú — Geração de Container Docker'));
        p.note(
          `Stack: Spring Boot ${info.spring?.bootVersion}\nJava: ${info.spring?.javaVersion}\nPorta: ${info.port}`,
          'Parâmetros detectados',
        );

        const shouldProceed = await p.confirm({
          message: 'Deseja gerar o Dockerfile e .dockerignore agora?',
          initialValue: true,
        });

        if (p.isCancel(shouldProceed) || !shouldProceed) {
          p.cancel('Operação cancelada pelo usuário.');
          return;
        }
      }

      // Escreve os arquivos
      const dockerfilePath = path.join(targetDir, 'Dockerfile');
      const dockerignorePath = path.join(targetDir, '.dockerignore');

      const dockerfileResult = writeFileWithPolicy(dockerfilePath, generated.dockerfile, {
        dryRun: options.dryRun,
        force: options.force,
        backup: true,
      });

      const dockerignoreResult = writeFileWithPolicy(dockerignorePath, generated.dockerignore, {
        dryRun: options.dryRun,
        force: options.force,
        backup: true,
      });

      const results: WriteFileResult[] = [dockerfileResult, dockerignoreResult];

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              success: true,
              results,
              dryRun: Boolean(options.dryRun),
            },
            null,
            2,
          ),
        );
        return;
      }

      // Exibição amigável no terminal
      console.log();
      for (const res of results) {
        if (res.status === 'created') {
          logger.success(res.message);
        } else if (res.status === 'updated') {
          logger.success(res.message);
        } else if (res.status === 'identical') {
          logger.info(res.message);
        } else {
          logger.warn(res.message);
        }
      }

      if (!options.dryRun) {
        console.log();
        logger.info(`Próximos passos:`);
        console.log(`    docker build -t app .`);
        console.log(`    docker run -p ${info.port}:${info.port} app`);
        console.log();
      }
    });

  return docker;
}
