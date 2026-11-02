import process from 'node:process';
import { Command } from 'commander';
import { detectProject } from '../detectors/index.js';
import { logger } from '../core/logger.js';

export function createHabitatCommand(): Command {
  const habitat = new Command('habitat');

  habitat
    .description('Detecta e exibe informações sobre o projeto e a infraestrutura existente')
    .option('--json', 'Retorna o resultado em formato JSON')
    .option('-d, --dir <caminho>', 'Diretório raiz do projeto a ser analisado', process.cwd())
    .action((options: { json?: boolean; dir: string }) => {
      const info = detectProject(options.dir);

      if (!info) {
        if (options.json) {
          console.log(JSON.stringify({ error: 'Nenhum projeto suportado detectado.' }, null, 2));
        } else {
          logger.error(
            'Nenhum projeto suportado detectado no diretório (esperado Spring Boot ou NestJS).',
          );
        }
        process.exitCode = 1;
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(info, null, 2));
      } else {
        logger.habitat(info);
      }
    });

  return habitat;
}

