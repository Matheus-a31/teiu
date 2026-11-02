import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index.js';

describe('Teiú Smoke Test', () => {
  it('should expose the current version', () => {
    expect(VERSION).toBe('0.1.0');
  });

  it('should run basic assertions', () => {
    expect(1 + 1).toBe(2);
  });
});
