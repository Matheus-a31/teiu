export type DatabaseType = 'postgres' | 'mysql' | 'none';
export type CacheType = 'redis' | 'none';

export interface ComposeServiceConfig {
  image: string;
  environment?: Record<string, string>;
  ports?: string[];
  volumes?: string[];
  restart?: string;
  healthcheck?: {
    test: string[] | string;
    interval?: string;
    timeout?: string;
    retries?: number;
    start_period?: string;
  };
}

export const SERVICE_DEFINITIONS: Record<'postgres' | 'mysql' | 'redis', ComposeServiceConfig> = {
  postgres: {
    image: 'postgres:16-alpine',
    restart: 'unless-stopped',
    environment: {
      POSTGRES_DB: '${POSTGRES_DB:-appdb}',
      POSTGRES_USER: '${POSTGRES_USER:-app}',
      POSTGRES_PASSWORD: '${POSTGRES_PASSWORD:-secret}',
    },
    ports: ['${POSTGRES_PORT:-5432}:5432'],
    volumes: ['postgres_data:/var/lib/postgresql/data'],
    healthcheck: {
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-app} -d ${POSTGRES_DB:-appdb}'],
      interval: '10s',
      timeout: '5s',
      retries: 5,
      start_period: '10s',
    },
  },
  mysql: {
    image: 'mysql:8.0',
    restart: 'unless-stopped',
    environment: {
      MYSQL_DATABASE: '${MYSQL_DATABASE:-appdb}',
      MYSQL_USER: '${MYSQL_USER:-app}',
      MYSQL_PASSWORD: '${MYSQL_PASSWORD:-secret}',
      MYSQL_ROOT_PASSWORD: '${MYSQL_ROOT_PASSWORD:-rootsecret}',
    },
    ports: ['${MYSQL_PORT:-3306}:3306'],
    volumes: ['mysql_data:/var/lib/mysql'],
    healthcheck: {
      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost'],
      interval: '10s',
      timeout: '5s',
      retries: 5,
      start_period: '15s',
    },
  },
  redis: {
    image: 'redis:7-alpine',
    restart: 'unless-stopped',
    ports: ['${REDIS_PORT:-6379}:6379'],
    volumes: ['redis_data:/data'],
    healthcheck: {
      test: ['CMD', 'redis-cli', 'ping'],
      interval: '10s',
      timeout: '5s',
      retries: 5,
    },
  },
};

export function getServiceDefinition(
  service: 'postgres' | 'mysql' | 'redis',
): ComposeServiceConfig {
  return structuredClone(SERVICE_DEFINITIONS[service]);
}

export function getVolumeName(service: 'postgres' | 'mysql' | 'redis'): string {
  switch (service) {
    case 'postgres':
      return 'postgres_data';
    case 'mysql':
      return 'mysql_data';
    case 'redis':
      return 'redis_data';
  }
}
