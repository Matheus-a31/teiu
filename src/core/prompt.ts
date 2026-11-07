import * as p from '@clack/prompts';
import type { DatabaseType, CacheType } from '../generators/compose/services.js';

export async function promptDatabase(
  initialValue: DatabaseType = 'postgres',
): Promise<DatabaseType | null> {
  const choice = await p.select({
    message: 'Precisa de banco de dados no docker-compose?',
    options: [
      { value: 'postgres', label: 'PostgreSQL', hint: 'postgres:16-alpine (Recomendado)' },
      { value: 'mysql', label: 'MySQL', hint: 'mysql:8.0' },
      { value: 'none', label: 'Nenhum' },
    ],
    initialValue,
  });

  if (p.isCancel(choice)) {
    p.cancel('Operação cancelada pelo usuário.');
    return null;
  }

  return choice as DatabaseType;
}

export async function promptCache(
  initialValue: CacheType = 'none',
): Promise<CacheType | null> {
  const choice = await p.select({
    message: 'Precisa de cache distribuído no docker-compose?',
    options: [
      { value: 'none', label: 'Nenhum', hint: 'Padrão' },
      { value: 'redis', label: 'Redis', hint: 'redis:7-alpine' },
    ],
    initialValue,
  });

  if (p.isCancel(choice)) {
    p.cancel('Operação cancelada pelo usuário.');
    return null;
  }

  return choice as CacheType;
}

export async function promptRegistry(
  initialValue: 'ghcr' | 'dockerhub' | 'ecr' = 'ghcr',
): Promise<'ghcr' | 'dockerhub' | 'ecr' | null> {
  const choice = await p.select({
    message: 'Qual container registry para push da imagem no CI?',
    options: [
      {
        value: 'ghcr',
        label: 'GitHub Container Registry (GHCR)',
        hint: 'Recomendado (zero-config)',
      },
      { value: 'dockerhub', label: 'Docker Hub' },
      { value: 'ecr', label: 'Amazon ECR' },
    ],
    initialValue,
  });

  if (p.isCancel(choice)) {
    p.cancel('Operação cancelada pelo usuário.');
    return null;
  }

  return choice as 'ghcr' | 'dockerhub' | 'ecr';
}

export async function promptConfirm(message: string, initialValue = true): Promise<boolean> {
  const choice = await p.confirm({
    message,
    initialValue,
  });

  if (p.isCancel(choice) || !choice) {
    p.cancel('Operação cancelada.');
    return false;
  }

  return true;
}
