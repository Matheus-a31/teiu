import { describe, it, expect, vi } from 'vitest';
import { runDiagnostics, createDoctorCommand } from '../../src/commands/doctor.js';

describe('Command: doctor', () => {
  it('should run environment diagnostics and return structured checks', () => {
    const result = runDiagnostics();

    expect(result).toHaveProperty('allOk');
    expect(result).toHaveProperty('checks');
    expect(result.checks.length).toBeGreaterThanOrEqual(4);

    const nodeCheck = result.checks.find((c) => c.name === 'Node.js');
    expect(nodeCheck).toBeDefined();
    expect(nodeCheck?.status).toBe('ok');

    const teiuCheck = result.checks.find((c) => c.name === 'Teiú CLI');
    expect(teiuCheck).toBeDefined();
    expect(teiuCheck?.status).toBe('ok');
  });

  it('should support JSON output in doctor command', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const doctor = createDoctorCommand();

    await doctor.parseAsync(['node', 'doctor', '--json']);

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(output as string);

    expect(parsed).toHaveProperty('checks');
    expect(parsed).toHaveProperty('allOk');

    logSpy.mockRestore();
  });

  it('should output visual text without throwing errors', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const doctor = createDoctorCommand();

    await doctor.parseAsync(['node', 'doctor']);

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
