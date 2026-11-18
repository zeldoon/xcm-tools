import {
  InvalidAddressError,
  isChainEvm,
  MissingParameterError,
  ScenarioNotSupportedError,
  ValidationError,
} from '@paraspell/sdk-core';
import { ethers } from 'ethers-v6';

import type { TBuildTransactionsOptions } from '../../types';
import { validateDestinationAddress } from '../../utils/validateDestinationAddress';

export const validateTransferOptions = <TApi, TRes, TSigner, TCustomChain extends string = never>(
  options: TBuildTransactionsOptions<TApi, TRes, TSigner, TCustomChain>,
) => {
  const { from, exchange, evmSenderAddress, sender, recipient, to, slippagePct } = options;

  if (exchange === undefined && from === undefined) {
    throw new MissingParameterError('from', 'Origin chain is required when exchange is auto');
  }

  if (to && !recipient) {
    throw new MissingParameterError('recipient', 'Recipient address is required');
  }

  if (to && recipient) validateDestinationAddress(recipient, to);

  if (evmSenderAddress !== undefined && !ethers.isAddress(evmSenderAddress)) {
    throw new InvalidAddressError('Evm injector address is not a valid Ethereum address');
  }

  if (ethers.isAddress(sender)) {
    throw new InvalidAddressError(
      'Injector address cannot be an Ethereum address. Please use an Evm injector address instead.',
    );
  }

  if (from && isChainEvm(from) && !evmSenderAddress) {
    throw new MissingParameterError('evmSenderAddress', 'EVM sender address is required');
  }

  validateSlippagePct(slippagePct);
};

// Exchanges compute minAmountOut = amountOut * (100 - slippage) / 100. Anything outside
// 0-100 yields a negative (u128-wrapped) or inflated minimum, and NaN crashes BigInt().
export const validateSlippagePct = (slippagePct: string | number | undefined) => {
  if (slippagePct === undefined) return;
  const pct = String(slippagePct).trim() === '' ? NaN : Number(slippagePct);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    throw new ValidationError(
      `Slippage must be a number between 0 and 100, got ${String(slippagePct)}.`,
    );
  }
};

export const validateRoutedFeeAsset = <TApi, TRes, TSigner, TCustomChain extends string = never>({
  feeAsset,
}: Pick<TBuildTransactionsOptions<TApi, TRes, TSigner, TCustomChain>, 'feeAsset'>) => {
  if (feeAsset) {
    throw new ScenarioNotSupportedError(
      'Fee asset is only supported for swaps that use the execute transfer',
    );
  }
};
