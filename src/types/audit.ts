export type RuleSeverity = 'critical' | 'warn' | 'info';

export interface AuditRuleResult {
  id: string;
  name: string;
  category: 'dockerfile' | 'ci';
  severity: RuleSeverity;
  passed: boolean;
  message: string;
  suggestion?: string;
}

export interface AuditCategoryReport {
  target: string;
  exists: boolean;
  rules: AuditRuleResult[];
}

export interface AuditReport {
  score: number; // 0 a 10
  status: 'excellent' | 'good' | 'poor' | 'critical';
  statusMessage: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    criticalIssues: number;
    warnings: number;
  };
  dockerfile?: AuditCategoryReport;
  ci?: AuditCategoryReport;
  suggestions: string[];
}
