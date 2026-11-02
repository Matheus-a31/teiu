import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { Command } from 'commander';
import { logger, type DoctorCheck, type DoctorResult } from '../core/logger.js';
import { VERSION } from '../index.js';

export function runDiagnostics(): DoctorResult {
  const checks: DoctorCheck[] = [];

  // 1. Checa versão do Node.js
  const nodeVersionStr = process.version;
  const majorNode = Number.parseInt(nodeVersionStr.replace(/^v/, '').split('.')[0] ?? '0', 10);
  if (majorNode >= 18) {
    checks.push({
      name: 'Node.js',
      status: 'ok',
      message: `${nodeVersionStr} (compatível ≥18)`,
    });
  } else {
    checks.push({
      name: 'Node.js',
      status: 'error',
      message: `${nodeVersionStr} (incompatível, requer ≥18)`,
      details: 'Atualize o Node.js para a versão 18 ou superior: https://nodejs.org',
    });
  }

  // 2. Checa Git
  try {
    const gitResult = spawnSync('git', ['--version'], {
      encoding: 'utf-8',
    });
    if (gitResult.status === 0 && gitResult.stdout) {
      const match = gitResult.stdout.trim().match(/git version ([\d.]+)/);
      const version = match ? match[1] : gitResult.stdout.trim();
      checks.push({
        name: 'Git',
        status: 'ok',
        message: version ? `v${version}` : 'Instalado',
      });
    } else {
      checks.push({
        name: 'Git',
        status: 'warn',
        message: 'Não encontrado',
        details: 'Instale o Git para controle de versão: https://git-scm.com',
      });
    }
  } catch {
    checks.push({
      name: 'Git',
      status: 'warn',
      message: 'Não encontrado',
      details: 'Instale o Git para controle de versão: https://git-scm.com',
    });
  }

  // 3. Checa Docker CLI
  let dockerInstalled = false;
  try {
    const dockerResult = spawnSync('docker', ['--version'], {
      encoding: 'utf-8',
    });
    if (dockerResult.status === 0 && dockerResult.stdout) {
      dockerInstalled = true;
      const match = dockerResult.stdout.trim().match(/Docker version ([\d.]+)/);
      const version = match ? match[1] : dockerResult.stdout.trim();
      checks.push({
        name: 'Docker CLI',
        status: 'ok',
        message: version ? `v${version}` : 'Instalado',
      });
    } else {
      checks.push({
        name: 'Docker CLI',
        status: 'warn',
        message: 'Não encontrado',
        details: 'Instale o Docker para gerar e buildar containers: https://www.docker.com',
      });
    }
  } catch {
    checks.push({
      name: 'Docker CLI',
      status: 'warn',
      message: 'Não encontrado',
      details: 'Instale o Docker para gerar e buildar containers: https://www.docker.com',
    });
  }

  // 4. Checa Docker Daemon (se CLI estiver presente)
  if (dockerInstalled) {
    try {
      const daemonResult = spawnSync('docker', ['info'], {
        encoding: 'utf-8',
      });
      if (daemonResult.status === 0) {
        checks.push({
          name: 'Docker Daemon',
          status: 'ok',
          message: 'Ativo e respondendo',
        });
      } else {
        checks.push({
          name: 'Docker Daemon',
          status: 'warn',
          message: 'Inativo ou sem resposta',
          details: 'Inicie o Docker Desktop / daemon do Docker na sua máquina.',
        });
      }
    } catch {
      checks.push({
        name: 'Docker Daemon',
        status: 'warn',
        message: 'Não foi possível conectar',
        details: 'Inicie o Docker Desktop / daemon do Docker na sua máquina.',
      });
    }
  }

  // 5. Versão do Teiú
  checks.push({
    name: 'Teiú CLI',
    status: 'ok',
    message: `v${VERSION} (versão instalada)`,
  });

  const allOk = checks.every((c) => c.status === 'ok');

  return {
    allOk,
    checks,
  };
}

export function createDoctorCommand(): Command {
  const doctor = new Command('doctor');

  doctor
    .description('Verifica os pré-requisitos do ambiente (Node, Git, Docker, etc.)')
    .option('--json', 'Retorna o diagnóstico em formato JSON')
    .action((options: { json?: boolean }) => {
      const result = runDiagnostics();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        logger.doctor(result);
      }

      if (!result.allOk && result.checks.some((c) => c.status === 'error')) {
        process.exitCode = 1;
      }
    });

  return doctor;
}
