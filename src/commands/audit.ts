import path from 'node:path';
import process from 'node:process';
import { Command } from 'commander';
import { runAudit } from '../audit/index.js';
import { detectProject } from '../detectors/index.js';
import { generateSpringDocker } from '../generators/docker/spring.js';
import { generateNestDocker } from '../generators/docker/nest.js';
import { writeFileWithPolicy, type WriteFileResult } from '../core/file-writer.js';
import { promptConfirm } from '../core/prompt.js';
import { logger } from '../core/logger.js';

export interface AuditCommandOptions {
  dir?: string;
  json?: boolean;
  fix?: boolean;
  yes?: boolean;
}

export function createAuditCommand(): Command {
  const audit = new Command('audit');

  audit
    .description('Analisa a infraestrutura existente (Dockerfile, CI/CD) e atribui score com sugestões')
    .argument('[caminho]', 'Diretório raiz do projeto')
    .option('-d, --dir <caminho>', 'Diretório raiz do projeto', process.cwd())
    .option('--json', 'Retorna o relatório de auditoria em formato JSON', false)
    .option('--fix', 'Regenera Dockerfile e .dockerignore otimizados aplicando as correções', false)
    .option('-y, --yes', 'Pula confirmações e aceita a aplicação automática do --fix', false)
    .action(async (caminho: string | undefined, options: AuditCommandOptions) => {
      const targetDir = path.resolve(caminho || options.dir || process.cwd());
      const report = runAudit(targetDir);

      if (options.json && !options.fix) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      if (!options.json) {
        logger.audit(report);
      }

      if (options.fix) {
        let shouldFix = options.yes || !process.stdin.isTTY;
        if (!shouldFix) {
          shouldFix = await promptConfirm(
            'Deseja regenerar Dockerfile e .dockerignore com padrões recomendados pelo Teiú?',
          );
        }

        if (!shouldFix) {
          return;
        }

        let info;
        try {
          info = detectProject(targetDir);
        } catch {
          info = null;
        }

        if (!info) {
          logger.error('Não foi possível identificar a stack do projeto para aplicar correções automáticas.');
          process.exitCode = 1;
          return;
        }

        const dockerOutput =
          info.stack === 'spring'
            ? generateSpringDocker(info)
            : generateNestDocker(info);

        const dfResult = writeFileWithPolicy(
          path.join(targetDir, 'Dockerfile'),
          dockerOutput.dockerfile,
          { force: true, backup: true },
        );

        const diResult = writeFileWithPolicy(
          path.join(targetDir, '.dockerignore'),
          dockerOutput.dockerignore,
          { force: true, backup: true },
        );

        const fixResults: WriteFileResult[] = [dfResult, diResult];

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                ...report,
                fixed: true,
                fixResults,
              },
              null,
              2,
            ),
          );
          return;
        }

        logger.printResults(fixResults, targetDir);
        logger.success('Infraestrutura corrigida com sucesso! Execute teiu audit novamente para conferir o novo score.');
      }
    });

  return audit;
}
