import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export interface PortDetectionResult {
  port: number;
  healthPath: string;
}

export function detectPortAndHealth(rootDir: string): PortDetectionResult {
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
          // Extrai server.port
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

          // Checa se há configuração customizada do actuator
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
      // Ignora erro de parsing e segue para o próximo arquivo
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

