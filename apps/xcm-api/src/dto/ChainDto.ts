import { CHAINS, SUBSTRATE_CHAINS } from '@paraspell/sdk';
import { z } from 'zod';

export const ChainSchema = z.enum(CHAINS);
export const SubstrateChainSchema = z.enum(SUBSTRATE_CHAINS);

export const ParaIdSchema = z
  .string()
  .regex(/^\d+$/, { message: 'Parachain ID must be a non-negative integer' })
  .transform(Number)
  .pipe(
    z
      .number()
      .int()
      .nonnegative()
      .max(2 ** 32 - 1),
  );
