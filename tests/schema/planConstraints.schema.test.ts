import { describe, it, expect } from 'vitest';
import { PlanConstraintsSchema } from 'src/schema/planConstraints';

describe('PlanConstraintsSchema', () => {
  it('applies defaults when fields omitted', () => {
    // Placeholder failing assertion until schema implemented
    const result = PlanConstraintsSchema.parse({});
    expect(result.maxWalkingDistance).toBe(1500);
    expect(result.maxTransfers).toBe(4);
    expect(result.optimize).toBe('balanced');
  });

  it('accepts updated optimize enum values', () => {
    // Spec-driven optimize values: 'balanced' | 'few_transfers' | 'shortest_time'
    expect(() => PlanConstraintsSchema.parse({ optimize: 'few_transfers' } as any)).not.toThrow();
    expect(() => PlanConstraintsSchema.parse({ optimize: 'shortest_time' } as any)).not.toThrow();
  });

  it('rejects maxWalkingDistance > 3000', () => {
    expect(() => PlanConstraintsSchema.parse({ maxWalkingDistance: 3500 })).toThrow();
  });

  it('rejects maxTransfers > 8', () => {
    expect(() => PlanConstraintsSchema.parse({ maxTransfers: 10 })).toThrow();
  });

  it('accepts boolean accessibility prefs and rejects non-boolean', () => {
    expect(() =>
      PlanConstraintsSchema.parse({
        accessibilityPrefs: {
          stepFree: true,
          fewTransfers: false,
          lowWalkingDistance: true,
          prioritizeLowFloor: false,
        },
      }),
    ).not.toThrow();

    expect(() =>
      PlanConstraintsSchema.parse({
        accessibilityPrefs: {
          stepFree: 'yes',
        },
      }),
    ).toThrow();
  });

  it('rejects unknown keys', () => {
    expect(() => PlanConstraintsSchema.parse({ foo: 'bar' } as any)).toThrow();
  });

  it('generates warning when prioritizeLowFloor unsupported by provider', () => {
    // Placeholder: real implementation would inspect provider capabilities and add warnings
    const result: any = PlanConstraintsSchema.parse({
      accessibilityPrefs: { prioritizeLowFloor: true },
    });
    expect(result.warnings).toBeDefined();
    expect(result.warnings).toContainEqual({ code: 'unsupported-accessibility-flag' });
  });
});