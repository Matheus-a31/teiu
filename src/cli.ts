import process from 'node:process';
import { Command } from 'commander';
import chalk from 'chalk';
import { createHabitatCommand } from './commands/habitat.js';
import { createDoctorCommand } from './commands/doctor.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('teiu')
    .description(`${chalk.green('🦎 Teiú')} — Infra pronta, do jeito certo.`)
    .version('0.1.0', '-v, --version', 'Exibe a versão do Teiú')
    .helpOption('-h, --help', 'Exibe a ajuda para comandos e opções');

  program.addCommand(createHabitatCommand());
  program.addCommand(createDoctorCommand());

  return program;
}

export const program = createCli();

export function runCli(argv: string[] = process.argv): void {
  program.parse(argv);
}
