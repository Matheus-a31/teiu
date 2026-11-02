import chalk from 'chalk';
import type { ProjectInfo } from '../types/project.js';

export const colors = {
  primary: chalk.hex('#14b8a6'), // Verde-água / Teal (identidade Teiú)
  accent: chalk.hex('#e05638'), // Terracota
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  muted: chalk.dim,
  bold: chalk.bold,
};

export const logger = {
  info(message: string): void {
    console.log(`${chalk.cyan('ℹ')} ${message}`);
  },

  success(message: string): void {
    console.log(`${chalk.green('✔')} ${message}`);
  },

  warn(message: string): void {
    console.log(`${chalk.yellow('⚠')} ${message}`);
  },

  error(message: string): void {
    console.error(`${chalk.red('✗')} ${message}`);
  },

  habitat(info: ProjectInfo): void {
    console.log();
    console.log(`${chalk.bold(colors.primary('🦎 Habitat detectado:'))}`);
    console.log();

    const rows: [string, string][] = [];

    if (info.stack === 'spring' && info.spring) {
      const kotlinStr = info.spring.isKotlin ? ' (Kotlin)' : '';
      rows.push(['Stack', `Spring Boot ${info.spring.bootVersion}${kotlinStr}`]);
      rows.push(['Java', `${info.spring.javaVersion}`]);

      const wrapperStr = info.spring.hasWrapper
        ? info.spring.buildTool === 'maven'
          ? 'mvnw presente'
          : 'gradlew presente'
        : 'sem wrapper';
      const buildToolName = info.spring.buildTool === 'maven' ? 'Maven' : 'Gradle';
      rows.push(['Build', `${buildToolName} (${wrapperStr})`]);
    } else if (info.stack === 'nest' && info.nest) {
      rows.push(['Stack', 'NestJS']);
      rows.push(['Node', info.nest.nodeVersion]);
      rows.push(['Package Manager', info.nest.packageManager]);
    }

    if (info.hasTests) {
      const testsDesc =
        info.testFrameworks && info.testFrameworks.length > 0
          ? info.testFrameworks.join(', ')
          : 'Presentes';
      rows.push(['Testes', testsDesc]);
    } else {
      rows.push(['Testes', colors.muted('Nenhum detectado')]);
    }

    rows.push(['Porta', `${info.port}`]);
    rows.push(['Health', `${info.healthPath} ${chalk.green('✓')}`]);

    // Imprime tabela alinhada
    const maxKeyLen = Math.max(...rows.map(([k]) => k.length), 10);
    for (const [key, val] of rows) {
      console.log(`  ${chalk.dim(key.padEnd(maxKeyLen + 2))} ${chalk.bold(val)}`);
    }

    console.log();
    console.log(`  ${chalk.bold('Arquivos de infra existentes:')}`);
    const dockerStatus = info.existing.dockerfile ? chalk.yellow('presente') : chalk.dim('ausente');
    const composeStatus = info.existing.compose ? chalk.yellow('presente') : chalk.dim('ausente');
    const ciStatus = info.existing.ci
      ? chalk.yellow(`presente (${info.existing.ciProvider ?? 'CI'})`)
      : chalk.dim('ausente');

    console.log(`    ${'Dockerfile'.padEnd(20)} ${dockerStatus}`);
    console.log(`    ${'docker-compose'.padEnd(20)} ${composeStatus}`);
    console.log(`    ${'Pipeline CI'.padEnd(20)} ${ciStatus}`);
    console.log();
  },
};
