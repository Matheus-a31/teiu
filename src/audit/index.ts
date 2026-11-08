import fs from 'node:fs';
import path from 'node:path';
import type { AuditReport, AuditCategoryReport } from '../types/audit.js';
import { auditDockerfile } from './dockerfile-rules.js';
import { auditCiWorkflow } from './ci-rules.js';
import { calculateScore } from './scorer.js';

export * from './dockerfile-rules.js';
export * from './ci-rules.js';
export * from './scorer.js';

export function runAudit(projectDir: string): AuditReport {
  let dockerfileReport: AuditCategoryReport | undefined;
  let ciReport: AuditCategoryReport | undefined;

  // 1. Auditoria de Dockerfile
  const dockerfilePath = path.join(projectDir, 'Dockerfile');
  if (fs.existsSync(dockerfilePath)) {
    const content = fs.readFileSync(dockerfilePath, 'utf-8');
    const rules = auditDockerfile({
      content,
      dockerfilePath,
      projectDir,
    });

    dockerfileReport = {
      target: 'Dockerfile',
      exists: true,
      rules,
    };
  } else {
    dockerfileReport = {
      target: 'Dockerfile',
      exists: false,
      rules: [
        {
          id: 'DOCKER_NOT_FOUND',
          name: 'Dockerfile',
          category: 'dockerfile',
          severity: 'critical',
          passed: false,
          message: 'Arquivo Dockerfile ausente no projeto',
          suggestion: 'Execute teiu docker para gerar um Dockerfile otimizado.',
        },
      ],
    };
  }

  // 2. Auditoria de CI/CD (GitHub Actions)
  const workflowsDir = path.join(projectDir, '.github', 'workflows');
  let workflowPath: string | undefined;

  if (fs.existsSync(workflowsDir)) {
    const files = fs.readdirSync(workflowsDir);
    const ciFile = files.find((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
    if (ciFile) {
      workflowPath = path.join(workflowsDir, ciFile);
    }
  }

  if (workflowPath && fs.existsSync(workflowPath)) {
    const content = fs.readFileSync(workflowPath, 'utf-8');
    const rules = auditCiWorkflow({
      content,
      workflowPath,
    });

    ciReport = {
      target: path.relative(projectDir, workflowPath),
      exists: true,
      rules,
    };
  }

  return calculateScore(dockerfileReport, ciReport);
}
