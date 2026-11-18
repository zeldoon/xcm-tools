import { isAssetEqual, type TAssetInfo } from '@paraspell/assets'
import { isExternalChain, type TChain, type TSubstrateChain } from '@paraspell/sdk-common'

import type { PolkadotApi } from '../../api'

/**
 * Non-native assets that AssetHub registers as teleportable with their issuing parachain
 * (`foreignAssets.reserves` = `{ reserve: <para>, teleportable: true }`). AssetHub only
 * accepts them by teleport from that parachain, a reserve transfer fails there with
 * `UntrustedReserveLocation` and the assets get trapped.
 */
const TELEPORTABLE_NON_NATIVE_ASSETS: Partial<Record<TSubstrateChain, string[]>> = {
  BifrostPolkadot: ['vDOT'],
  BifrostKusama: ['vKSM']
}

const findTeleportableReserve = <TApi, TRes, TSigner, TCustomChain extends string = never>(
  api: PolkadotApi<TApi, TRes, TSigner, TCustomChain>,
  asset: TAssetInfo
): TSubstrateChain | undefined =>
  (Object.keys(TELEPORTABLE_NON_NATIVE_ASSETS) as TSubstrateChain[]).find(chain =>
    (TELEPORTABLE_NON_NATIVE_ASSETS[chain] ?? []).some(symbol => {
      const teleportable = api.findAssetInfo(chain, { symbol }, null)
      return !!teleportable && isAssetEqual(teleportable, asset)
    })
  )

/**
 * Whether the asset can only enter AssetHub by teleport from its reserve parachain, but is
 * sent from a different parachain. Such a transfer has to go through the reserve, which then
 * teleports the asset to AssetHub; a plain reserve transfer gets the asset trapped on AssetHub.
 */
export const isAhTeleportOnlyAssetFromNonReserve = <
  TApi,
  TRes,
  TSigner,
  TCustomChain extends string = never
>(
  api: PolkadotApi<TApi, TRes, TSigner, TCustomChain>,
  origin: TChain | TCustomChain,
  dest: TChain | TCustomChain,
  asset: TAssetInfo
): boolean => {
  if (isExternalChain(origin) || isExternalChain(dest)) return false
  if (origin.includes('AssetHub') || !dest.includes('AssetHub')) return false

  const reserve = findTeleportableReserve(api, asset)
  return (
    reserve !== undefined &&
    reserve !== origin &&
    api.getRelayChainOf(reserve) === api.getRelayChainOf(dest)
  )
}

export const isNativeAssetTeleport = <TApi, TRes, TSigner, TCustomChain extends string = never>(
  api: PolkadotApi<TApi, TRes, TSigner, TCustomChain>,
  origin: TChain | TCustomChain,
  dest: TChain | TCustomChain,
  asset: TAssetInfo
): boolean => {
  if (isExternalChain(origin) || isExternalChain(dest)) return false

  const isOriginAh = origin.includes('AssetHub')
  const isDestAh = dest.includes('AssetHub')

  if (isOriginAh === isDestAh) return false
  if (api.getRelayChainOf(origin) !== api.getRelayChainOf(dest)) return false

  const para = isDestAh ? origin : dest
  if (para === 'Curio') return false

  if (isAssetEqual(api.findNativeAssetInfoOrThrow(para), asset)) return true

  return TELEPORTABLE_NON_NATIVE_ASSETS[para as TSubstrateChain] !== undefined
    ? findTeleportableReserve(api, asset) === para
    : false
}
