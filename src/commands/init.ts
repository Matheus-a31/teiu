import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Command } from 'commander';
import * as p from '@clack/prompts';
import { detectProject } from '../detectors/index.js';
import type { ProjectInfo } from '../types/project.js';
import { generateSpringDocker } from '../generators/docker/spring.js';
import { generateNestDocker } from '../generators/docker/nest.js';
import { generateCompose } from '../generators/compose/base.js';
import { generateEnvExample } from '../generators/dotfiles.js';
import { generateGithubWorkflow } from '../generators/ci/github.js';
import type { DatabaseType, CacheType } from '../generators/compose/services.js';
import { writeFileWithPolicy, type WriteFileResult } from '../core/file-writer.js';
import { logger, colors } from '../core/logger.js';

export interface InitCommandOptions {
  dir?: string;
  provider?: 'github' | 'gitlab' | 'none';
  db?: DatabaseType;
  cache?: CacheType;
  registry?: 'ghcr' | 'dockerhub' | 'ecr';
  baseImage?: string;
  force?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  json?: boolean;
}

export function createInitCommand(): Command {
  const init = new Command('init');

  init
    .description('Inicializa a infraestrutura completa do projeto (Dockerfile, Compose, CI/CD e dotfiles)')
    .argument('[caminho]', 'Diretório raiz do projeto')
    .option('-d, --dir <caminho>', 'Diretório raiz do projeto', process.cwd())
    .option('-p, --provider <provider>', 'Provider de CI/CD (github | gitlab | none)')
    .option('--db <tipo>', 'Banco de dados a incluir no compose (postgres | mysql | none)')
    .option('--cache <tipo>', 'Cache a incluir no compose (redis | none)')
    .option(
      '-r, --registry <registry>',
      'Container Registry para push da imagem no CI (ghcr | dockerhub | ecr)',
    )
    .option('--base-image <imagem>', 'Imagem base customizada para o runtime do Docker')
    .option('-f, --force', 'Sobrescreve arquivos existentes criando backup automático', false)
    .option('--dry-run', 'Simula a geração sem escrever arquivos no disco', false)
    .option('-y, --yes', 'Pula confirmações e aceita os padrões recomendados', false)
    .option('--json', 'Retorna o resultado da operação em formato JSON', false)
    .action(async (caminho: string | undefined, options: InitCommandOptions) => {
      const targetDir = path.resolve(caminho || options.dir || process.cwd());

      let info: ProjectInfo | null = null;
      try {
        info = detectProject(targetDir);
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

      if (!info) {
        if (options.json) {
          console.log(
            JSON.stringify({ error: 'Nenhum projeto suportado detectado.', status: 'error' }, null, 2),
          );
        } else {
          logger.error('Nenhum projeto suportado detectado no diretório especificado.');
        }
        process.exitCode = 1;
        return;
      }

      const isInteractive = !options.yes && Boolean(process.stdin.isTTY) && !options.json;

      let selectedProvider: 'github' | 'gitlab' | 'none' = options.provider || 'github';
      let selectedDb: DatabaseType =
        options.db || (info.stack === 'spring' ? 'postgres' : 'none');
      let selectedCache: CacheType = options.cache || 'none';
      let selectedRegistry: 'ghcr' | 'dockerhub' | 'ecr' = options.registry || 'ghcr';

      if (isInteractive) {
        p.intro(colors.primary('🦎 Teiú — Toolkit de Entrega, Infraestrutura e Unificação'));

        if (info.stack === 'spring') {
          const tool = info.spring?.buildTool === 'maven' ? 'Maven' : 'Gradle';
          p.log.success(
            `Stack detectada: Spring Boot ${info.spring?.bootVersion || ''} · Java ${info.spring?.javaVersion || ''} · ${tool}`,
          );
        } else if (info.stack === 'nest') {
          p.log.success(
            `Stack detectada: NestJS · Node ${info.nest?.nodeVersion || '20'} · ${info.nest?.packageManager || 'npm'}`,
          );
        }

        if (info.hasTests) {
          const frameworks = info.testFrameworks?.join(', ') || 'Testes configurados';
          p.log.success(`Testes detectados: ${frameworks}`);
        }

        // 1. CI Provider
        if (!options.provider) {
          const res = await p.select({
            message: 'Qual provider de CI/CD deseja utilizar?',
            options: [
              { value: 'github', label: 'GitHub Actions', hint: 'Recomendado' },
              { value: 'gitlab', label: 'GitLab CI', hint: 'Em breve na v0.2' },
              { value: 'none', label: 'Nenhum' },
            ],
            initialValue: 'github',
          });
          if (p.isCancel(res)) {
            p.cancel('Operação cancelada.');
            return;
          }
          selectedProvider = res as 'github' | 'gitlab' | 'none';
        }

        // 2. Database
        if (!options.db) {
          const res = await p.select({
            message: 'Precisa de banco de dados no docker-compose?',
            options: [
              { value: 'postgres', label: 'PostgreSQL', hint: 'Recomendado' },
              { value: 'mysql', label: 'MySQL' },
              { value: 'none', label: 'Nenhum' },
            ],
            initialValue: info.stack === 'spring' ? 'postgres' : 'none',
          });
          if (p.isCancel(res)) {
            p.cancel('Operação cancelada.');
            return;
          }
          selectedDb = res as DatabaseType;
        }

        // 3. Cache
        if (!options.cache) {
          const res = await p.select({
            message: 'Precisa de cache distribuído no docker-compose?',
            options: [
              { value: 'none', label: 'Nenhum', hint: 'Padrão' },
              { value: 'redis', label: 'Redis' },
            ],
            initialValue: 'none',
          });
          if (p.isCancel(res)) {
            p.cancel('Operação cancelada.');
            return;
          }
          selectedCache = res as CacheType;
        }

        // 4. Registry (apenas se GitHub Actions for selecionado)
        if (selectedProvider === 'github' && !options.registry) {
          const res = await p.select({
            message: 'Qual container registry para push da imagem no CI?',
            options: [
              {
                value: 'ghcr',
                label: 'GitHub Container Registry (GHCR)',
                hint: 'Recomendado (zero-config)',
              },
              { value: 'dockerhub', label: 'Docker Hub' },
              { value: 'ecr', label: 'Amazon ECR' },
            ],
            initialValue: 'ghcr',
          });
          if (p.isCancel(res)) {
            p.cancel('Operação cancelada.');
            return;
          }
          selectedRegistry = res as 'ghcr' | 'dockerhub' | 'ecr';
        }

        // Lista de arquivos a serem gerados
        const filesToGenerate = [
          'Dockerfile',
          '.dockerignore',
          'docker-compose.yml',
          '.env.example',
        ];
        if (selectedProvider === 'github') {
          filesToGenerate.push('.github/workflows/ci.yml');
        }

        p.note(
          filesToGenerate.map((f) => ` • ${f}`).join('\n'),
          'Arquivos que serão gerados:',
        );

        const confirmed = await p.confirm({
          message: 'Confirmar a geração dos arquivos de infraestrutura?',
          initialValue: true,
        });

        if (p.isCancel(confirmed) || !confirmed) {
          p.cancel('Operação cancelada.');
          return;
        }
      }

      // Geração dos arquivos
      const results: WriteFileResult[] = [];

      // 1. Dockerfile & .dockerignore
      const dockerOutput =
        info.stack === 'spring'
          ? generateSpringDocker(info, { baseImage: options.baseImage })
          : generateNestDocker(info, { baseImage: options.baseImage });

      results.push(
        writeFileWithPolicy(path.join(targetDir, 'Dockerfile'), dockerOutput.dockerfile, {
          dryRun: options.dryRun,
          force: options.force,
          backup: true,
        }),
      );

      results.push(
        writeFileWithPolicy(path.join(targetDir, '.dockerignore'), dockerOutput.dockerignore, {
          dryRun: options.dryRun,
          force: options.force,
          backup: true,
        }),
      );

      // 2. docker-compose.yml & .env.example
      const composePath = path.join(targetDir, 'docker-compose.yml');
      let existingComposeContent: string | undefined;
      if (fs.existsSync(composePath) && !options.force) {
        existingComposeContent = fs.readFileSync(composePath, 'utf-8');
      }

      const composeOutput = generateCompose(info, {
        db: selectedDb,
        cache: selectedCache,
        existingComposeContent,
      });

      results.push(
        writeFileWithPolicy(composePath, composeOutput.content, {
          dryRun: options.dryRun,
          force: options.force,
          backup: true,
        }),
      );

      const envExampleContent = generateEnvExample(info, {
        db: selectedDb,
        cache: selectedCache,
      });

      results.push(
        writeFileWithPolicy(path.join(targetDir, '.env.example'), envExampleContent, {
          dryRun: options.dryRun,
          force: options.force,
          backup: true,
        }),
      );

      // 3. CI Pipeline
      if (selectedProvider === 'github') {
        const ciOutput = generateGithubWorkflow(info, { registry: selectedRegistry });
        results.push(
          writeFileWithPolicy(path.join(targetDir, ciOutput.targetPath), ciOutput.content, {
            dryRun: options.dryRun,
            force: options.force,
            backup: true,
          }),
        );
      } else if (selectedProvider === 'gitlab') {
        logger.warn(
          'Suporte a GitLab CI está planejado para o release v0.2. O pipeline CI não foi gerado.',
        );
      }

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              success: true,
              stack: info.stack,
              provider: selectedProvider,
              db: selectedDb,
              cache: selectedCache,
              registry: selectedRegistry,
              results,
              dryRun: Boolean(options.dryRun),
            },
            null,
            2,
          ),
        );
        return;
      }

      // Visual feedback
      console.log();
      for (const res of results) {
        if (res.status === 'created' || res.status === 'updated') {
          logger.success(res.message);
          if (res.backupPath) {
            logger.info(`Backup salvo em: ${path.relative(targetDir, res.backupPath)}`);
          }
        } else if (res.status === 'identical') {
          logger.info(res.message);
        } else {
          logger.warn(res.message);
        }
      }

      if (!options.dryRun) {
        console.log();
        logger.info('Pronto! Próximos passos:');
        console.log('    docker compose up --build');
        console.log('    git add . && git commit -m "chore: infra via Teiú"');
        console.log();
      }
    });

  return init;
}
