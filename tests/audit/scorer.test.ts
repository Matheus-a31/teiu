import { describe, it, expect } from 'vitest';
import { calculateScore } from '../../src/audit/scorer.js';
import type { AuditCategoryReport } from '../../src/types/audit.js';

describe('Audit: Scorer', () => {
  it('should score 10/10 and excellent when all rules pass', () => {
    const report: AuditCategoryReport = {
      target: 'Dockerfile',
      exists: true,
      rules: [
        { id: 'R1', name: 'R1', category: 'dockerfile', severity: 'warn', passed: true, message: 'OK' },
        { id: 'R2', name: 'R2', category: 'dockerfile', severity: 'critical', passed: true, message: 'OK' },
      ],
    };

    const result = calculateScore(report);
    expect(result.score).toBe(10);
    expect(result.status).toBe('excellent');
    expect(result.summary.failed).toBe(0);
    expect(result.suggestions.length).toBe(0);
  });

  it('should deduct points according to severity and categorize poor/critical', () => {
    const badReport: AuditCategoryReport = {
      target: 'Dockerfile',
      exists: true,
      rules: [
        {
          id: 'R1',
          name: 'Non Root',
          category: 'dockerfile',
          severity: 'critical',
          passed: false,
          message: 'Root',
          suggestion: 'Fix root',
        },
        {
          id: 'R2',
          name: 'Multistage',
          category: 'dockerfile',
          severity: 'warn',
          passed: false,
          message: 'Single',
          suggestion: 'Fix multistage',
        },
        {
          id: 'R3',
          name: 'Health',
          category: 'dockerfile',
          severity: 'warn',
          passed: false,
          message: 'No health',
          suggestion: 'Fix health',
        },
        {
          id: 'R4',
          name: 'Ignore',
          category: 'dockerfile',
          severity: 'warn',
          passed: false,
          message: 'No ignore',
          suggestion: 'Fix ignore',
        },
      ],
    };

    // 10 - 2.5 - 1.25 - 1.25 - 1.25 = 3.75 -> round to 3.8
    const result = calculateScore(badReport);
    expect(result.score).toBe(3.8);
    expect(result.status).toBe('critical');
    expect(result.summary.failed).toBe(4);
    expect(result.suggestions.length).toBe(4);
  });

  it('should return score 0 when no rules are provided', () => {
    const result = calculateScore();
    expect(result.score).toBe(0);
    expect(result.status).toBe('critical');
  });
});
