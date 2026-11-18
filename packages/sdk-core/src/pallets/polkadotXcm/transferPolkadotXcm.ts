// Contains basic structure of polkadotXCM call

import { getXcmPallet, type TPallet } from '@paraspell/pallets'
import { isExternalChain } from '@paraspell/sdk-common'

import { DEFAULT_FEE_ASSET } from '../../constants'
import { ScenarioNotSupportedError } from '../../errors'
import { createTypeAndThenCall, validateFeeAssetSupport } from '../../transfer'
import type { TPolkadotXcmMethod, TSerializedExtrinsics } from '../../types'
import { type TPolkadotXCMTransferOptions } from '../../types'
import { addXcmVersionHeader, isAhTeleportOnlyAssetFromNonReserve } from '../../utils'
import { maybeOverrideAssets } from '../../utils/asset'
import { createDestination } from '../../utils/location'

export const transferPolkadotXcm = async <TApi, TRes, TSigner, TCustomChain extends string = never>(
  options: TPolkadotXCMTransferOptions<TApi, TRes, TSigner, TCustomChain>,
  method: TPolkadotXcmMethod = 'transfer_assets_using_type_and_then',
  fees: 'Unlimited' | { Limited: string } | undefined = undefined
): Promise<TRes> => {
  const {
    api,
    chain,
    destination,
    destChain,
    assetInfo: asset,
    beneficiaryLocation,
    asset: multiAsset,
    overriddenAsset,
    feeAssetInfo,
    pallet,
    version,
    method: methodOverride,
    paraIdTo
  } = options

  if (method === 'transfer_assets_using_type_and_then') {
    const noFeeAsset = !(typeof destination !== 'object' && isExternalChain(destination))
    return api.deserializeExtrinsics(await createTypeAndThenCall(options, { noFeeAsset }))
  }

  validateFeeAssetSupport(asset, feeAssetInfo, overriddenAsset, methodOverride ?? method)

  // AssetHub only accepts these assets by teleport from their reserve chain, a reserve transfer
  // from any other chain fails there with UntrustedReserveLocation and traps the assets
  if (
    (methodOverride ?? method).includes('reserve_transfer_assets') &&
    destChain &&
    isAhTeleportOnlyAssetFromNonReserve(api, chain, destChain, asset)
  ) {
    throw new ScenarioNotSupportedError(
      `${asset.symbol} can only be transferred to ${destChain} by teleport from its reserve chain, a reserve transfer from ${chain} would be rejected there and the assets would be trapped.`
    )
  }

  const resolvedMultiAssets = maybeOverrideAssets(
    version,
    asset.amount,
    [multiAsset],
    overriddenAsset
  )

  const destLocation = createDestination(api, version, chain, destination, paraIdTo)

  const feeAssetIndex =
    overriddenAsset === undefined
      ? DEFAULT_FEE_ASSET
      : overriddenAsset.findIndex(asset => asset.isFeeAsset)

  const call: TSerializedExtrinsics = {
    module: (pallet as TPallet) ?? getXcmPallet(chain),
    method: methodOverride ?? method,
    params: {
      dest: addXcmVersionHeader(destLocation, version),
      beneficiary: addXcmVersionHeader(beneficiaryLocation, version),
      assets: addXcmVersionHeader(resolvedMultiAssets, version),
      fee_asset_item: feeAssetIndex,
      ...(fees !== undefined ? { weight_limit: fees } : {})
    }
  }

  return Promise.resolve(api.deserializeExtrinsics(call))
}
