import type { AuditRuleResult } from '../types/audit.js';

export interface CiAuditContext {
  content: string;
  workflowPath: string;
}

function hasAutomatedTests(content: string): boolean {
  const lines = content.split('\n');
  return lines.some((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      return false;
    }
    return (
      /(npm|yarn|pnpm)\s+(run\s+)?test\b/i.test(trimmed) ||
      (/\bmvnw?\b/i.test(trimmed) && /\b(verify|test)\b/i.test(trimmed)) ||
      (/\bgradlew?\b/i.test(trimmed) && /\b(check|test)\b/i.test(trimmed))
    );
  });
}

export function auditCiWorkflow(context: CiAuditContext): AuditRuleResult[] {
  const { content } = context;
  const rules: AuditRuleResult[] = [];

  // 1. Cache de dependências configurado
  const hasCache =
    /cache:\s*['"]?(npm|pnpm|yarn|maven|gradle)['"]?/i.test(content) ||
    /actions\/cache/i.test(content) ||
    /cache-(from|to):\s*type=gha/i.test(content);

  rules.push({
    id: 'CI_CACHE',
    name: 'Cache de dependências no CI',
    category: 'ci',
    severity: 'warn',
    passed: hasCache,
    message: hasCache
      ? 'Cache de dependências habilitado'
      : 'Pipeline sem cache configurado (aumenta tempo e custo de execução)',
    suggestion: hasCache
      ? undefined
      : 'Configurar cache de dependências no setup-node/setup-java ou cache-from no Docker Buildx.',
  });

  // 2. Execução de testes automatizados
  const hasTests = hasAutomatedTests(content);

  rules.push({
    id: 'CI_TESTS',
    name: 'Execução de testes automatizados',
    category: 'ci',
    severity: 'critical',
    passed: hasTests,
    message: hasTests
      ? 'Execução de testes automatizados presente'
      : 'Pipeline não executa testes automatizados antes do build/push',
    suggestion: hasTests
      ? undefined
      : 'Adicionar etapa de testes (ex: mvn verify, gradle check ou npm test).',
  });

  // 3. Push condicional (não empurrar em Pull Requests)
  const hasDockerPush = /docker\/(build-push-action|login-action)/i.test(content) || /docker\s+push/i.test(content);
  let isConditionalPush = true;
  if (hasDockerPush) {
    const hasCondition =
      /pull_request/i.test(content) &&
      (content.includes('!= \'pull_request\'') || content.includes('!= "pull_request"'));
    const hasBranchCheck = /refs\/heads\/(main|master)/i.test(content);
    isConditionalPush = hasCondition || hasBranchCheck;
  }

  rules.push({
    id: 'CI_CONDITIONAL_PUSH',
    name: 'Push de imagem condicional',
    category: 'ci',
    severity: 'warn',
    passed: isConditionalPush,
    message: isConditionalPush
      ? 'Push de imagem restrito a branches principais'
      : 'Push de imagem executado sem restrição de branch/evento',
    suggestion: isConditionalPush
      ? undefined
      : 'Configurar push condicional para evitar push de imagens em pull requests.',
  });

  // 4. Sem senhas ou segredos hardcoded
  const hasHardcodedPassword =
    /password:\s*["'][^$][^"']+["']/i.test(content) ||
    /token:\s*["'][^$][^"']+["']/i.test(content);

  rules.push({
    id: 'CI_HARDCODED_SECRETS',
    name: 'Segurança de credenciais',
    category: 'ci',
    severity: 'critical',
    passed: !hasHardcodedPassword,
    message: !hasHardcodedPassword
      ? 'Nenhuma credencial exposta em texto plano'
      : 'Possíveis credenciais ou senhas em texto plano no pipeline',
    suggestion: !hasHardcodedPassword
      ? undefined
      : 'Utilizar GitHub Secrets (ex: ${{ secrets.DOCKER_PASSWORD }}).',
  });

  return rules;
}
