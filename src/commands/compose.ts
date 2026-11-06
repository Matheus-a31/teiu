import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Command } from 'commander';
import * as p from '@clack/prompts';
import { detectProject } from '../detectors/index.js';
import { generateCompose } from '../generators/compose/base.js';
import { generateEnvExample } from '../generators/dotfiles.js';
import type { DatabaseType, CacheType } from '../generators/compose/services.js';
import { writeFileWithPolicy, type WriteFileResult } from '../core/file-writer.js';
import { logger, colors } from '../core/logger.js';

export interface ComposeCommandOptions {
  dir: string;
  db?: DatabaseType;
  cache?: CacheType;
  dryRun?: boolean;
  force?: boolean;
  yes?: boolean;
  json?: boolean;
}

export function createComposeCommand(): Command {
  const compose = new Command('compose');

  compose
    .description('Gera docker-compose.yml e .env.example com suporte a merge inteligente')
    .option('-d, --dir <caminho>', 'Diretório raiz do projeto', process.cwd())
    .option('--db <tipo>', 'Banco de dados a incluir (postgres, mysql, none)')
    .option('--cache <tipo>', 'Cache a incluir (redis, none)')
    .option('--dry-run', 'Simula a geração sem escrever arquivos no disco')
    .option('--force', 'Sobrescreve arquivos existentes criando backup automático')
    .option('-y, --yes', 'Pula confirmações e aceita os padrões')
    .option('--json', 'Retorna o resultado da operação em formato JSON')
    .action(async (options: ComposeCommandOptions) => {
      const targetDir = path.resolve(options.dir);
      const info = detectProject(targetDir);

      if (!info) {
        if (options.json) {
          console.log(JSON.stringify({ error: 'Nenhum projeto suportado detectado.' }, null, 2));
        } else {
          logger.error('Nenhum projeto suportado detectado para geração do docker-compose.');
        }
        process.exitCode = 1;
        return;
      }

      let selectedDb: DatabaseType = options.db || 'none';
      let selectedCache: CacheType = options.cache || 'none';

      // Interativo se não passar flags e não for --yes / --json / --dry-run
      if (!options.yes && !options.json && !options.dryRun && (!options.db || !options.cache)) {
        p.intro(colors.primary('🦎 Teiú — Configuração de Docker Compose'));

        if (!options.db) {
          const dbChoice = await p.select({
            message: 'Precisa de banco de dados no compose?',
            options: [
              { value: 'postgres', label: 'PostgreSQL (recomendado)', hint: 'postgres:16-alpine' },
              { value: 'mysql', label: 'MySQL', hint: 'mysql:8.0' },
              { value: 'none', label: 'Nenhum' },
            ],
            initialValue: 'postgres',
          });

          if (p.isCancel(dbChoice)) {
            p.cancel('Operação cancelada pelo usuário.');
            return;
          }
          selectedDb = dbChoice as DatabaseType;
        }

        if (!options.cache) {
          const cacheChoice = await p.select({
            message: 'Precisa de cache ou mensageria leve?',
            options: [
              { value: 'redis', label: 'Redis', hint: 'redis:7-alpine' },
              { value: 'none', label: 'Nenhum' },
            ],
            initialValue: 'none',
          });

          if (p.isCancel(cacheChoice)) {
            p.cancel('Operação cancelada pelo usuário.');
            return;
          }
          selectedCache = cacheChoice as CacheType;
        }
      }

      // Lê compose existente para Merge Inteligente se presente
      const composeFilePath = path.join(targetDir, 'docker-compose.yml');
      let existingComposeContent: string | undefined;
      if (fs.existsSync(composeFilePath)) {
        existingComposeContent = fs.readFileSync(composeFilePath, 'utf-8');
      }

      const composeResult = generateCompose(info, {
        db: selectedDb,
        cache: selectedCache,
        existingComposeContent,
      });

      const envExampleContent = generateEnvExample(info, {
        db: selectedDb,
        cache: selectedCache,
      });

      const envExamplePath = path.join(targetDir, '.env.example');

      // Escreve os arquivos
      const composeFileResult = writeFileWithPolicy(composeFilePath, composeResult.content, {
        dryRun: options.dryRun,
        force: options.force || composeResult.isMerged, // Merge é seguro e não perde dados existentes
        backup: !composeResult.isMerged, // Só cria backup em caso de substituição total
      });

      const envExampleResult = writeFileWithPolicy(envExamplePath, envExampleContent, {
        dryRun: options.dryRun,
        force: options.force,
        backup: true,
      });

      const results: WriteFileResult[] = [composeFileResult, envExampleResult];

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              success: true,
              isMerged: composeResult.isMerged,
              addedServices: composeResult.addedServices,
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
      if (composeResult.isMerged) {
        if (composeResult.addedServices.length > 0) {
          logger.success(
            `Merge inteligente aplicado: serviços adicionados ao docker-compose.yml: ${composeResult.addedServices.join(', ')}`,
          );
        } else {
          logger.info('docker-compose.yml já continha todos os serviços solicitados.');
        }
      }

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
        logger.info('Próximos passos:');
        console.log('    cp .env.example .env');
        console.log('    docker compose up --build');
        console.log();
      }
    });

  return compose;
}
