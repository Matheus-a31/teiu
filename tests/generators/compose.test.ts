import path from 'node:path';
import { describe, it, expect } from 'vitest';
import YAML from 'yaml';
import { detectProject } from '../../src/detectors/index.js';
import { generateCompose } from '../../src/generators/compose/base.js';
import { generateEnvExample } from '../../src/generators/dotfiles.js';

describe('Generator: Docker Compose & Dotfiles', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('should generate basic docker-compose for Spring project without db', () => {
    const info = detectProject(path.join(fixturesDir, 'spring-maven'));
    expect(info).not.toBeNull();

    const result = generateCompose(info!);
    expect(result.isMerged).toBe(false);

    const parsed = YAML.parse(result.content);
    expect(parsed.services.app).toBeDefined();
    expect(parsed.services.app.ports).toContain('${PORT:-8080}:8080');
    expect(parsed.services.postgres).toBeUndefined();
    expect(parsed.services.redis).toBeUndefined();
    expect(parsed.volumes).toBeUndefined();

    expect(result.content).toMatchSnapshot();
  });

  it('should generate docker-compose with PostgreSQL and Redis for Nest project', () => {
    const info = detectProject(path.join(fixturesDir, 'nest-npm'));
    expect(info).not.toBeNull();

    const result = generateCompose(info!, { db: 'postgres', cache: 'redis' });
    expect(result.addedServices).toEqual(['postgres', 'redis']);

    const parsed = YAML.parse(result.content);
    expect(parsed.services.app).toBeDefined();
    expect(parsed.services.app.depends_on.postgres.condition).toBe('service_healthy');
    expect(parsed.services.app.depends_on.redis.condition).toBe('service_healthy');

    expect(parsed.services.postgres.image).toBe('postgres:16-alpine');
    expect(parsed.services.redis.image).toBe('redis:7-alpine');

    expect(parsed.volumes.postgres_data).toBeDefined();
    expect(parsed.volumes.redis_data).toBeDefined();

    expect(result.content).toMatchSnapshot();
  });

  it('should generate docker-compose with MySQL', () => {
    const info = detectProject(path.join(fixturesDir, 'nest-npm'));
    const result = generateCompose(info!, { db: 'mysql' });

    const parsed = YAML.parse(result.content);
    expect(parsed.services.mysql.image).toBe('mysql:8.0');
    expect(parsed.volumes.mysql_data).toBeDefined();
    expect(parsed.services.app.depends_on.mysql.condition).toBe('service_healthy');
  });

  it('should intelligently merge new services into existing docker-compose.yml', () => {
    const info = detectProject(path.join(fixturesDir, 'nest-npm'));
    const existingYaml = `
services:
  custom-api:
    image: my-company/api:v1
    ports:
      - "8000:8000"
volumes:
  existing_vol:
`;

    const result = generateCompose(info!, {
      db: 'postgres',
      cache: 'redis',
      existingComposeContent: existingYaml,
    });

    expect(result.isMerged).toBe(true);
    expect(result.addedServices).toContain('postgres');
    expect(result.addedServices).toContain('redis');

    const parsed = YAML.parse(result.content);
    // Preservou o serviço customizado
    expect(parsed.services['custom-api']).toBeDefined();
    expect(parsed.volumes['existing_vol']).toBeDefined();

    // Adicionou novos serviços
    expect(parsed.services.postgres).toBeDefined();
    expect(parsed.services.redis).toBeDefined();
    expect(parsed.volumes.postgres_data).toBeDefined();
    expect(parsed.volumes.redis_data).toBeDefined();

    // Vinculou depends_on ao serviço existente
    expect(parsed.services['custom-api'].depends_on.postgres.condition).toBe('service_healthy');
  });

  it('should generate .env.example with database and cache variables', () => {
    const info = detectProject(path.join(fixturesDir, 'nest-npm'));
    const envContent = generateEnvExample(info!, { db: 'postgres', cache: 'redis' });

    expect(envContent).toContain('PORT=3000');
    expect(envContent).toContain('POSTGRES_DB=appdb');
    expect(envContent).toContain('POSTGRES_USER=app');
    expect(envContent).toContain('DATABASE_URL=postgresql://app:secret@localhost:5432/appdb');
    expect(envContent).toContain('REDIS_URL=redis://localhost:6379');
  });
});
