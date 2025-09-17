import { describe, it, expect } from 'vitest';
import { CoordinateSchema } from 'src/schema/coordinate';

describe('CoordinateSchema', () => {
  it('accepts a valid coordinate', () => {
    const valid = { lat: 60.17, lon: 24.93 };
    expect(() => CoordinateSchema.parse(valid)).not.toThrow();
  });

  it('rejects latitude > 90', () => {
    expect(() => CoordinateSchema.parse({ lat: 95, lon: 0 })).toThrow();
  });

  it('rejects latitude < -90', () => {
    expect(() => CoordinateSchema.parse({ lat: -95, lon: 0 })).toThrow();
  });

  it('rejects longitude > 180', () => {
    expect(() => CoordinateSchema.parse({ lat: 0, lon: 190 })).toThrow();
  });

  it('rejects longitude < -180', () => {
    expect(() => CoordinateSchema.parse({ lat: 0, lon: -190 })).toThrow();
  });

  it('rejects NaN and Infinity', () => {
    expect(() => CoordinateSchema.parse({ lat: NaN, lon: 0 })).toThrow();
    expect(() => CoordinateSchema.parse({ lat: Infinity, lon: 0 })).toThrow();
    expect(() => CoordinateSchema.parse({ lat: 0, lon: NaN })).toThrow();
    expect(() => CoordinateSchema.parse({ lat: 0, lon: -Infinity })).toThrow();
  });
});