import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export interface PortDetectionResult {
  port: number;
  healthPath: string;
}

export function detectPortAndHealth(
  rootDir: string,
  stack: 'spring' | 'nest' = 'spring',
): PortDetectionResult {
  if (stack === 'spring') {
    const candidateFiles = [
      path.join(rootDir, 'src', 'main', 'resources', 'application.yml'),
      path.join(rootDir, 'src', 'main', 'resources', 'application.yaml'),
      path.join(rootDir, 'src', 'main', 'resources', 'application.properties'),
      path.join(rootDir, 'application.yml'),
      path.join(rootDir, 'application.yaml'),
      path.join(rootDir, 'application.properties'),
    ];

    let detectedPort: number | undefined;
    let customHealthPath: string | undefined;

    for (const filePath of candidateFiles) {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8');

        if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
          const parsed = YAML.parse(content) as Record<string, unknown> | null;
          if (parsed && typeof parsed === 'object') {
            const server = parsed['server'] as Record<string, unknown> | undefined;
            if (server && server['port'] !== undefined) {
              const parsedPort = Number.parseInt(String(server['port']), 10);
              if (!Number.isNaN(parsedPort)) {
                detectedPort = parsedPort;
              }
            } else if (parsed['server.port'] !== undefined) {
              const parsedPort = Number.parseInt(String(parsed['server.port']), 10);
              if (!Number.isNaN(parsedPort)) {
                detectedPort = parsedPort;
              }
            }

            const management = parsed['management'] as Record<string, unknown> | undefined;
            if (management) {
              const endpoints = management['endpoints'] as Record<string, unknown> | undefined;
              const web = endpoints?.['web'] as Record<string, unknown> | undefined;
              const basePath = web?.['base-path'];
              if (basePath && typeof basePath === 'string') {
                customHealthPath = `${basePath.replace(/\/$/, '')}/health`;
              }
            }
          }
        } else if (filePath.endsWith('.properties')) {
          const lines = content.split('\n');
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (line.startsWith('#') || line.startsWith('!')) continue;

            const portMatch = line.match(/^server\.port\s*=\s*(\d+)/);
            if (portMatch && portMatch[1]) {
              detectedPort = Number.parseInt(portMatch[1], 10);
            }

            const healthMatch = line.match(/^management\.endpoints\.web\.base-path\s*=\s*(.+)/);
            if (healthMatch && healthMatch[1]) {
              const basePath = healthMatch[1].trim().replace(/\/$/, '');
              customHealthPath = `${basePath}/health`;
            }
          }
        }
      } catch {
        // Ignora erro de parsing
      }

      if (detectedPort !== undefined) {
        break;
      }
    }

    return {
      port: detectedPort ?? 8080,
      healthPath: customHealthPath ?? '/actuator/health',
    };
  }

  // Detecção para NestJS
  let detectedPort: number | undefined;

  // 1. Checa variáveis em arquivos de ambiente (.env, .env.example, .env.local)
  const envFiles = [
    path.join(rootDir, '.env'),
    path.join(rootDir, '.env.local'),
    path.join(rootDir, '.env.example'),
  ];

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      try {
        const envContent = fs.readFileSync(envFile, 'utf-8');
        const match = envContent.match(/^(?:PORT|APP_PORT|SERVER_PORT)\s*=\s*(\d+)/m);
        if (match && match[1]) {
          detectedPort = Number.parseInt(match[1], 10);
          break;
        }
      } catch {
        // Ignora erro
      }
    }
  }

  // 2. Checa main.ts / main.js
  if (detectedPort === undefined) {
    const mainFiles = [
      path.join(rootDir, 'src', 'main.ts'),
      path.join(rootDir, 'src', 'main.js'),
      path.join(rootDir, 'main.ts'),
      path.join(rootDir, 'main.js'),
    ];

    for (const mainFile of mainFiles) {
      if (fs.existsSync(mainFile)) {
        try {
          const content = fs.readFileSync(mainFile, 'utf-8');
          // Ex: app.listen(process.env.PORT || 3000) ou app.listen(3000)
          const portMatch =
            content.match(/app\.listen\([^,)]*\|\|\s*(\d+)\)/) ||
            content.match(/app\.listen\(\s*(\d+)\s*\)/);
          if (portMatch && portMatch[1]) {
            detectedPort = Number.parseInt(portMatch[1], 10);
            break;
          }
        } catch {
          // Ignora erro
        }
      }
    }
  }

  return {
    port: detectedPort ?? 3000,
    healthPath: '/health',
  };
}
