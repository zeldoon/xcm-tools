import type { TAssetInfo } from '@paraspell/assets'
import { isAssetEqual } from '@paraspell/assets'
import type { TChain } from '@paraspell/sdk-common'
import { isExternalChain } from '@paraspell/sdk-common'

import type { PolkadotApi } from '../../api'
import { UnsupportedOperationError } from '../../errors'

/**
 * Destinations that only buy XCM execution with the assets their XcmPaymentApi reports
 * (verified with destination dry-runs). Other chains, e.g. AssetHub with its asset
 * conversion pools, also accept assets that are not listed, so the flag is not reliable there.
 */
const STRICT_FEE_ASSET_CHAINS: TChain[] = ['Hydration', 'Ajuna']

/**
 * Whether the destination is known NOT to accept the asset as an XCM execution fee asset.
 *
 * The fee asset list comes from the destination's XcmPaymentApi
 * (`query_acceptable_payment_assets`), so this only returns true for destinations that
 * expose that API, have at least one fee asset in the registry and list the asset
 * without the fee flag, and only for destinations in `STRICT_FEE_ASSET_CHAINS`.
 */
export const isNonFeeAssetOnDest = <TApi, TRes, TSigner, TCustomChain extends string = never>(
  api: PolkadotApi<TApi, TRes, TSigner, TCustomChain>,
  destChain: TChain | TCustomChain | undefined,
  asset: TAssetInfo
): boolean => {
  if (!destChain || isExternalChain(destChain)) return false
  if (!STRICT_FEE_ASSET_CHAINS.includes(destChain as TChain)) return false
  if (!api.hasXcmPaymentApiSupport(destChain)) return false

  const destAssets = api.getAssets(destChain as TChain)
  if (!destAssets.some(a => a.isFeeAsset)) return false

  const destAsset = destAssets.find(a => isAssetEqual(a, asset))
  return destAsset !== undefined && !destAsset.isFeeAsset && !destAsset.isNative
}

/**
 * Throws when the transferred asset is the only asset that can buy execution on the
 * destination, but the destination does not accept it as an XCM fee asset.
 *
 * Without this check the transfer is built and submitted, the origin succeeds, and the
 * destination fails at BuyExecution (AssetNotFound / TooExpensive), trapping the assets.
 */
export const validateDestFeeAsset = <TApi, TRes, TSigner, TCustomChain extends string = never>(
  api: PolkadotApi<TApi, TRes, TSigner, TCustomChain>,
  destChain: TChain | TCustomChain | undefined,
  asset: TAssetInfo,
  feeAsset: TAssetInfo | undefined,
  overriddenAsset: unknown
) => {
  // A separate fee asset or an overridden multi-asset decides what pays the fees
  if (feeAsset || overriddenAsset) return
  if (!isNonFeeAssetOnDest(api, destChain, asset)) return

  throw new UnsupportedOperationError(
    `${asset.symbol} is not accepted as an XCM fee asset on ${destChain}, so the transfer would fail at BuyExecution on ${destChain} and the funds would be trapped there. Send it together with a fee asset that ${destChain} accepts (multi-asset currency with feeAsset).`
  )
}
