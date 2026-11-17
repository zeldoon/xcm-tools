import { describe, expect, it } from 'vitest';

import { ParaIdSchema } from './ChainDto.js';

describe('ParaIdSchema', () => {
  it.each([
    ['0', 0],
    ['1000', 1000],
    ['2034', 2034],
    ['4294967295', 4294967295],
  ])('accepts the decimal parachain ID %s', (input, expected) => {
    expect(ParaIdSchema.parse(input)).toBe(expected);
  });

  it.each([
    ' ',
    '',
    '-0',
    '+1000',
    '0x3e8',
    '1e3',
    '1000.0',
    'Infinity',
    'abc',
    '4294967296',
  ])('rejects the non-canonical parachain ID %j', (input) => {
    expect(ParaIdSchema.safeParse(input).success).toBe(false);
  });
});
