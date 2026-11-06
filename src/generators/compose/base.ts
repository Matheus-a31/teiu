import YAML from 'yaml';
import type { ProjectInfo } from '../../types/project.js';
import {
  type DatabaseType,
  type CacheType,
  getServiceDefinition,
  getVolumeName,
  type ComposeServiceConfig,
} from './services.js';

export interface GenerateComposeOptions {
  db?: DatabaseType;
  cache?: CacheType;
  existingComposeContent?: string;
}

export interface GenerateComposeResult {
  content: string;
  isMerged: boolean;
  addedServices: string[];
}

interface ComposeDocument {
  version?: string;
  services: Record<string, unknown>;
  volumes?: Record<string, unknown>;
  [key: string]: unknown;
}

export function generateCompose(
  projectInfo: ProjectInfo,
  options: GenerateComposeOptions = {},
): GenerateComposeResult {
  const { db = 'none', cache = 'none', existingComposeContent } = options;
  const addedServices: string[] = [];

  // Se já existe conteúdo de compose, executa Merge Inteligente
  if (existingComposeContent && existingComposeContent.trim().length > 0) {
    let parsed: ComposeDocument;
    try {
      parsed = (YAML.parse(existingComposeContent) as ComposeDocument) || { services: {} };
    } catch {
      parsed = { services: {} };
    }

    if (!parsed.services || typeof parsed.services !== 'object') {
      parsed.services = {};
    }

    const servicesToInject: ('postgres' | 'mysql' | 'redis')[] = [];
    if (db === 'postgres' || db === 'mysql') {
      servicesToInject.push(db);
    }
    if (cache === 'redis') {
      servicesToInject.push(cache);
    }

    for (const serviceName of servicesToInject) {
      if (!parsed.services[serviceName]) {
        parsed.services[serviceName] = getServiceDefinition(serviceName);
        addedServices.push(serviceName);

        // Adiciona volume se necessário
        const volName = getVolumeName(serviceName);
        if (volName) {
          if (!parsed.volumes || typeof parsed.volumes !== 'object') {
            parsed.volumes = {};
          }
          if (!parsed.volumes[volName]) {
            parsed.volumes[volName] = {};
          }
        }

        // Tenta conectar o serviço ao serviço principal da aplicação ('app' ou primeiro serviço)
        const servicesNames: string[] = servicesToInject;
        const appServiceName = parsed.services['app']
          ? 'app'
          : Object.keys(parsed.services).find((s) => !servicesNames.includes(s));

        if (appServiceName && parsed.services[appServiceName]) {
          const appService = parsed.services[appServiceName] as Record<string, unknown>;
          if (!appService['depends_on']) {
            appService['depends_on'] = {};
          }

          if (
            typeof appService['depends_on'] === 'object' &&
            !Array.isArray(appService['depends_on'])
          ) {
            const deps = appService['depends_on'] as Record<string, unknown>;
            deps[serviceName] = { condition: 'service_healthy' };
          }
        }
      }
    }

    return {
      content: YAML.stringify(parsed),
      isMerged: true,
      addedServices,
    };
  }

  // Geração de um novo docker-compose.yml do zero
  const port = projectInfo.port || (projectInfo.stack === 'spring' ? 8080 : 3000);

  const appService: Record<string, unknown> = {
    build: {
      context: '.',
      dockerfile: 'Dockerfile',
    },
    restart: 'unless-stopped',
    ports: [`\${PORT:-${port}}:${port}`],
    env_file: ['.env'],
  };

  const services: Record<string, ComposeServiceConfig | Record<string, unknown>> = {
    app: appService,
  };
  const volumes: Record<string, Record<string, unknown>> = {};
  const dependsOn: Record<string, { condition: string }> = {};

  if (db === 'postgres' || db === 'mysql') {
    services[db] = getServiceDefinition(db);
    addedServices.push(db);
    const volName = getVolumeName(db);
    if (volName) {
      volumes[volName] = {};
    }
    dependsOn[db] = { condition: 'service_healthy' };
  }

  if (cache === 'redis') {
    services['redis'] = getServiceDefinition('redis');
    addedServices.push('redis');
    const volName = getVolumeName('redis');
    if (volName) {
      volumes[volName] = {};
    }
    dependsOn['redis'] = { condition: 'service_healthy' };
  }

  if (Object.keys(dependsOn).length > 0) {
    appService['depends_on'] = dependsOn;
  }

  const doc: Record<string, unknown> = {
    services,
  };

  if (Object.keys(volumes).length > 0) {
    doc['volumes'] = volumes;
  }

  return {
    content: YAML.stringify(doc),
    isMerged: false,
    addedServices,
  };
}
