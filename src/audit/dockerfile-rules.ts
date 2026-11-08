import fs from 'node:fs';
import path from 'node:path';
import type { AuditRuleResult } from '../types/audit.js';

export interface DockerfileAuditContext {
  content: string;
  dockerfilePath: string;
  projectDir: string;
}

export function auditDockerfile(context: DockerfileAuditContext): AuditRuleResult[] {
  const { content, projectDir } = context;
  const lines = content.split('\n').map((l) => l.trim());
  const rules: AuditRuleResult[] = [];

  // 1. Multi-stage build
  const fromMatches = content.match(/^FROM\s+/gim) || [];
  const isMultiStage = fromMatches.length > 1;
  rules.push({
    id: 'DOCKER_MULTI_STAGE',
    name: 'Multi-stage build',
    category: 'dockerfile',
    severity: 'warn',
    passed: isMultiStage,
    message: isMultiStage
      ? 'Multi-stage build configurado'
      : 'Sem multi-stage build (imagem final pode conter ferramentas de build pesadas)',
    suggestion: isMultiStage
      ? undefined
      : 'Utilizar multi-stage build separando o estágio de compilação do estágio de runtime.',
  });

  // 2. Non-root user
  const userLines = lines.filter((l) => /^USER\s+/i.test(l));
  const hasNonRootUser = userLines.some((l) => !/^USER\s+(root|0)\s*$/i.test(l));
  rules.push({
    id: 'DOCKER_NON_ROOT',
    name: 'Usuário não-root',
    category: 'dockerfile',
    severity: 'critical',
    passed: hasNonRootUser,
    message: hasNonRootUser
      ? 'Executando sob usuário não-root'
      : 'Executando como root (risco de segurança)',
    suggestion: hasNonRootUser
      ? undefined
      : 'Adicionar USER app ou USER node com privilégios reduzidos.',
  });

  // 3. Healthcheck
  const hasHealthcheck = lines.some((l) => /^HEALTHCHECK\s+/i.test(l));
  rules.push({
    id: 'DOCKER_HEALTHCHECK',
    name: 'Healthcheck em runtime',
    category: 'dockerfile',
    severity: 'warn',
    passed: hasHealthcheck,
    message: hasHealthcheck
      ? 'HEALTHCHECK configurado'
      : 'Sem instrução HEALTHCHECK',
    suggestion: hasHealthcheck
      ? undefined
      : 'Adicionar HEALTHCHECK para monitoramento de saúde do container em runtime.',
  });

  // 4. .dockerignore presente
  const dockerignoreExists = fs.existsSync(path.join(projectDir, '.dockerignore'));
  rules.push({
    id: 'DOCKER_DOCKERIGNORE',
    name: 'Presença de .dockerignore',
    category: 'dockerfile',
    severity: 'warn',
    passed: dockerignoreExists,
    message: dockerignoreExists
      ? '.dockerignore presente'
      : 'Sem .dockerignore (contexto de build desnecessariamente grande)',
    suggestion: dockerignoreExists
      ? undefined
      : 'Adicionar .dockerignore ignorando .git, build, target e node_modules.',
  });

  // 5. Imagem base enxuta (runtime)
  const lastFromMatch = content.match(/FROM\s+([^\s]+)(?:\s+AS\s+[^\s]+)?/gim)?.pop();
  let isSlim = true;
  if (lastFromMatch) {
    const rawImage = lastFromMatch.replace(/^FROM\s+/i, '').split(/\s+/)[0] || '';
    const isExplicitlyHeavy =
      /^openjdk:/i.test(rawImage) ||
      /-jdk/i.test(rawImage) ||
      (/node:\d+$/i.test(rawImage) && !rawImage.includes('alpine') && !rawImage.includes('slim'));
    const isSlimImage =
      rawImage.includes('alpine') ||
      rawImage.includes('slim') ||
      rawImage.includes('distroless') ||
      rawImage.includes('jre');

    isSlim = !isExplicitlyHeavy && (isSlimImage || !isMultiStage ? isSlimImage : true);
  }
  rules.push({
    id: 'DOCKER_SLIM_IMAGE',
    name: 'Imagem base enxuta',
    category: 'dockerfile',
    severity: 'warn',
    passed: isSlim,
    message: isSlim
      ? 'Imagem base de runtime enxuta'
      : 'Imagem base de runtime pesada ou não otimizada',
    suggestion: isSlim
      ? undefined
      : 'Usar imagens base enxutas (alpine, slim ou jre) no runtime para economizar centenas de MB.',
  });

  // 6. Cache de dependências
  const firstCopyIndex = lines.findIndex((l) => /^COPY\s+/i.test(l));
  const isFullCopyFirst =
    firstCopyIndex !== -1 && /^COPY\s+\.\s+(\.|\/app|\/build|\.\/)/i.test(lines[firstCopyIndex] || '');
  const isCacheOptimized = !isFullCopyFirst;
  rules.push({
    id: 'DOCKER_DEP_CACHE',
    name: 'Otimização de cache de dependências',
    category: 'dockerfile',
    severity: 'warn',
    passed: isCacheOptimized,
    message: isCacheOptimized
      ? 'Dependências copiadas antes do código-fonte'
      : 'Cache de dependências não otimizado (COPY . . antes de instalar dependências)',
    suggestion: isCacheOptimized
      ? undefined
      : 'Copiar arquivos de dependências (package.json, pom.xml) antes do código-fonte para aproveitar o cache.',
  });

  return rules;
}
