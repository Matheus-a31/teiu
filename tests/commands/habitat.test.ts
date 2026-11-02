import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { createHabitatCommand } from '../../src/commands/habitat.js';

describe('Command: habitat', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('should support JSON output for spring-maven', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const habitat = createHabitatCommand();

    await habitat.parseAsync([
      'node',
      'habitat',
      '--json',
      '--dir',
      path.join(fixturesDir, 'spring-maven'),
    ]);

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(output as string);

    expect(parsed.stack).toBe('spring');
    expect(parsed.spring.bootVersion).toBe('3.2.1');
    expect(parsed.spring.buildTool).toBe('maven');
    expect(parsed.port).toBe(8080);

    logSpy.mockRestore();
  });

  it('should support JSON output for nest-npm', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const habitat = createHabitatCommand();

    await habitat.parseAsync([
      'node',
      'habitat',
      '--json',
      '--dir',
      path.join(fixturesDir, 'nest-npm'),
    ]);

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(output as string);

    expect(parsed.stack).toBe('nest');
    expect(parsed.nest.packageManager).toBe('npm');
    expect(parsed.nest.nodeVersion).toBe('20');
    expect(parsed.port).toBe(3000);

    logSpy.mockRestore();
  });

  it('should print human-readable habitat output without errors', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const habitat = createHabitatCommand();

    await habitat.parseAsync(['node', 'habitat', '--dir', path.join(fixturesDir, 'spring-gradle')]);

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
