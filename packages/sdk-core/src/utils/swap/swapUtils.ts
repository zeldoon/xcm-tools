import { DEFAULT_SWAP_SLIPPAGE, EXCHANGE_CHAINS } from '../../constants'
import { UnsupportedOperationError, ValidationError } from '../../errors'
import { getSwapExtensionOrThrow } from '../../extensions'
import type {
  TApiOrUrl,
  TBuilderConfig,
  TBuilderOptions,
  TExchangeChain,
  TExchangeInput,
  TSwapBuilder,
  TTransferOptionsWithSwap,
  TUrl
} from '../../types'
import { assertAddressIsString, assertSender, assertToIsString } from '../assertions'
import { isConfig } from '../guards'

const isUrl = (value: unknown): value is string | string[] =>
  typeof value === 'string' || Array.isArray(value)

/**
 * Checks if a given chain is a supported exchange chain.
 *
 * @param chain - The chain to check.
 * @returns True if the chain is a supported exchange chain; otherwise, false.
 */
export const isExchange = (chain: string): chain is TExchangeChain =>
  EXCHANGE_CHAINS.some(c => c === chain)

export const convertBuilderConfig = <TApi>(
  config: TBuilderOptions<TApiOrUrl<TApi>> | undefined
): TBuilderConfig<TUrl> | undefined => {
  if (!config) return undefined

  if (isConfig(config)) {
    const { apiOverrides, ...rest } = config

    if (!apiOverrides) {
      return rest
    }

    if (
      config.apiOverrides &&
      Object.values(config.apiOverrides).some(url => typeof url === 'object')
    ) {
      throw new UnsupportedOperationError(
        'Swap module does not support API client override with non-string values'
      )
    }

    const filteredApiOverrides = Object.fromEntries(
      Object.entries(apiOverrides).filter(([, value]) => isUrl(value))
    )

    return {
      ...config,
      apiOverrides: filteredApiOverrides
    }
  }

  if (!isUrl(config)) {
    throw new UnsupportedOperationError('Swap module does not support API client override')
  }
}

export const createSwapBuilder = <TApi, TRes, TSigner, TCustomChain extends string = never>(
  options: TTransferOptionsWithSwap<TApi, TRes, TSigner, TCustomChain>
) => {
  const { api } = options

  if (options.transactOptions?.call) {
    throw new UnsupportedOperationError('Cannot use transact options together with swap options.')
  }

  const { SwapBuilder } = getSwapExtensionOrThrow()

  const {
    from,
    to,
    currency,
    feeAsset,
    swapOptions: { currencyTo, evmSenderAddress, exchange, slippage, onStatusChange },
    sender,
    recipient: address
  } = options

  assertToIsString(to)
  assertAddressIsString(address)
  assertSender(sender)

  if (Array.isArray(currency)) {
    throw new UnsupportedOperationError('Swaps with multiple currencies are not supported.')
  }

  // Exchanges compute minAmountOut = amountOut * (100 - slippage) / 100. Anything outside
  // 0-100 yields a negative (u128-wrapped) or inflated minimum, and NaN crashes BigInt().
  if (slippage !== undefined) {
    const pct = String(slippage).trim() === '' ? NaN : Number(slippage)
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new ValidationError(
        `Slippage must be a number between 0 and 100, got ${String(slippage)}.`
      )
    }
  }

  let builder = SwapBuilder(api)
    .from(from)
    .exchange(exchange)
    .to(to)
    .currencyFrom(currency)
    .currencyTo(currencyTo)
    .feeAsset(feeAsset)
    .amount(currency.amount)
    .sender(sender)
    .evmSenderAddress(evmSenderAddress)
    .recipient(address)
    .slippagePct(slippage?.toString() ?? DEFAULT_SWAP_SLIPPAGE.toString())

  if (onStatusChange) {
    builder = builder.onStatusChange(onStatusChange)
  }

  return builder
}

export const executeWithSwap = async <TApi, TRes, TSigner, T, TCustomChain extends string = never>(
  options: TTransferOptionsWithSwap<TApi, TRes, TSigner, TCustomChain>,
  executor: (builder: TSwapBuilder<TApi, TRes, TSigner, TCustomChain>) => Promise<T>
) => {
  const swapBuilder = createSwapBuilder(options)
  return executor(swapBuilder)
}

export const normalizeExchange = (exchange: TExchangeInput): TExchangeInput =>
  Array.isArray(exchange)
    ? exchange.length === 0
      ? undefined
      : exchange.length === 1
        ? exchange[0]
        : exchange
    : exchange
