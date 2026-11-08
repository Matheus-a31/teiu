import path from 'node:path';
import chalk from 'chalk';
import type { ProjectInfo } from '../types/project.js';
import type { WriteFileResult } from './file-writer.js';
import type { AuditReport, AuditCategoryReport } from '../types/audit.js';

export interface DoctorCheck {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  details?: string;
}

export interface DoctorResult {
  allOk: boolean;
  checks: DoctorCheck[];
}

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

  printResults(results: WriteFileResult[], targetDir?: string): void {
    console.log();
    for (const res of results) {
      if (res.status === 'created' || res.status === 'updated') {
        this.success(res.message);
        if (res.backupPath && targetDir) {
          this.info(`Backup salvo em: ${path.relative(targetDir, res.backupPath)}`);
        }
      } else if (res.status === 'identical') {
        this.info(res.message);
      } else {
        this.warn(res.message);
      }
    }
  },

  audit(report: AuditReport): void {
    console.log();
    console.log(`${chalk.bold(colors.primary('🦎 Auditando infraestrutura...'))}`);
    console.log();

    const printCategory = (title: string, categoryReport?: AuditCategoryReport) => {
      console.log(chalk.bold(title));
      if (!categoryReport || !categoryReport.exists) {
        console.log(`  ${chalk.red('✗')} Arquivo não encontrado`);
        return;
      }

      const failedRules = categoryReport.rules.filter((r) => !r.passed);
      if (failedRules.length === 0) {
        console.log(`  ${chalk.green('✓')} OK`);
        return;
      }

      for (const rule of categoryReport.rules) {
        if (!rule.passed) {
          const icon = rule.severity === 'critical' ? chalk.red('✗') : chalk.yellow('⚠');
          console.log(`  ${icon} ${rule.message}`);
        }
      }
    };

    if (report.dockerfile) {
      printCategory('Dockerfile', report.dockerfile);
      console.log();
    }

    if (report.ci) {
      printCategory('Pipeline CI / CD', report.ci);
      console.log();
    }

    if (report.suggestions.length > 0) {
      console.log(chalk.bold('Sugestões:'));
      for (const sug of report.suggestions) {
        console.log(`  • ${sug}`);
      }
      console.log();
    }

    const scoreColor =
      report.score >= 9 ? chalk.green : report.score >= 7 ? chalk.cyan : report.score >= 4 ? chalk.yellow : chalk.red;

    console.log(
      `${chalk.bold('Score:')} ${scoreColor(`${report.score}/10`)} — ${report.statusMessage}`,
    );
    console.log();
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
      rows.push(['Entry File', info.nest.entryFile]);
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
    const maxKeyLen = Math.max(...rows.map(([k]) => k.length), 15);
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

  doctor(result: DoctorResult): void {
    console.log();
    console.log(`${chalk.bold(colors.primary('🦎 Teiú Doctor — Diagnóstico do Ambiente:'))}`);
    console.log();

    const maxNameLen = Math.max(...result.checks.map((c) => c.name.length), 16);

    for (const check of result.checks) {
      let icon = chalk.green('✔');
      if (check.status === 'warn') icon = chalk.yellow('⚠');
      if (check.status === 'error') icon = chalk.red('✗');

      const nameStr = chalk.dim(check.name.padEnd(maxNameLen + 2));
      const messageStr =
        check.status === 'error'
          ? chalk.red(check.message)
          : check.status === 'warn'
            ? chalk.yellow(check.message)
            : chalk.bold(check.message);

      console.log(`  ${nameStr} ${messageStr.padEnd(32)} ${icon}`);
      if (check.details) {
        console.log(`  ${''.padEnd(maxNameLen + 2)} ${chalk.dim(check.details)}`);
      }
    }

    console.log();
    if (result.allOk) {
      console.log(
        `  ${chalk.green('✔')} ${colors.primary('Ambiente pronto e 100% compatível com o Teiú! 🦎')}`,
      );
    } else {
      console.log(
        `  ${chalk.yellow('⚠')} ${chalk.yellow('Algumas ferramentas precisam de atenção para funcionamento completo.')}`,
      );
    }
    console.log();
  },
};
