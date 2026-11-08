import type { AuditReport, AuditRuleResult, AuditCategoryReport } from '../types/audit.js';

export function calculateScore(
  dockerfileReport?: AuditCategoryReport,
  ciReport?: AuditCategoryReport,
): AuditReport {
  const allRules: AuditRuleResult[] = [
    ...(dockerfileReport?.rules || []),
    ...(ciReport?.rules || []),
  ];

  let deductions = 0;
  let criticalIssues = 0;
  let warnings = 0;
  let passed = 0;
  let failed = 0;
  const suggestions: string[] = [];

  for (const rule of allRules) {
    if (rule.passed) {
      passed += 1;
    } else {
      failed += 1;
      if (rule.suggestion) {
        suggestions.push(rule.suggestion);
      }

      if (rule.severity === 'critical') {
        deductions += 2.5;
        criticalIssues += 1;
      } else if (rule.severity === 'warn') {
        deductions += 1.25;
        warnings += 1;
      } else {
        deductions += 0.5;
      }
    }
  }

  // Se nenhum arquivo de infra foi analisado
  if (allRules.length === 0) {
    return {
      score: 0,
      status: 'critical',
      statusMessage: 'Nenhum arquivo de infraestrutura encontrado para auditoria.',
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        criticalIssues: 0,
        warnings: 0,
      },
      suggestions: ['Execute teiu init para gerar a infraestrutura completa do seu projeto.'],
    };
  }

  const rawScore = Math.max(0, Math.min(10, 10 - deductions));
  const score = Math.round(rawScore * 10) / 10;

  let status: AuditReport['status'];
  let statusMessage: string;

  if (score >= 9.0) {
    status = 'excellent';
    statusMessage = 'Excelente! Infraestrutura otimizada e segura 🦎';
  } else if (score >= 7.0) {
    status = 'good';
    statusMessage = 'Boa infraestrutura, mas com pontos de melhoria!';
  } else if (score >= 4.0) {
    status = 'poor';
    statusMessage = 'Dá pra melhorar bastante 🦎';
  } else {
    status = 'critical';
    statusMessage = 'Crítico — requer atenção e ajustes imediatos ⚠';
  }

  return {
    score,
    status,
    statusMessage,
    summary: {
      total: allRules.length,
      passed,
      failed,
      criticalIssues,
      warnings,
    },
    dockerfile: dockerfileReport,
    ci: ciReport,
    suggestions,
  };
}
