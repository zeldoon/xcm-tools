/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PolkadotClient } from 'polkadot-api'

import type { TAssetInfoNoLoc } from '../types'
import { decodeSymbol, normalizeLocation } from '../utils/codecUtils'
import { edString } from '../utils'

export const fetchCentrifugeAssets = async (client: PolkadotClient): Promise<TAssetInfoNoLoc[]> => {
  const api = client.getUnsafeApi()
  const entries = await api.query.OrmlAssetRegistry.Metadata.getEntries()

  // Only ForeignAsset(id) entries can be selected by the SDK (Centrifuge uses
  // { ForeignAsset: id } as currency id). LocalAsset(id) and Tranche(..) ids live in a
  // different id space, so mapping them to assetId would collide with ForeignAsset ids.
  return entries
    .filter(({ keyArgs: [key] }: any) => key?.type === 'ForeignAsset')
    .map(({ keyArgs: [key], value }: any) => ({
      assetId: String(key.value),
      symbol: decodeSymbol(value.symbol),
      decimals: value.decimals,
      location: normalizeLocation(value.location),
      existentialDeposit: edString(value)
    }))
}

export const fetchCentrifugeNativeAssets = async (
  client: PolkadotClient
): Promise<TAssetInfoNoLoc[]> => {
  const api = client.getUnsafeApi()
  const entries = await api.query.OrmlAssetRegistry.Metadata.getEntries()
  return entries
    .filter(({ keyArgs: [key] }: any) => key?.type === 'Native')
    .map(({ value }: any) => ({
      symbol: decodeSymbol(value.symbol),
      decimals: value.decimals,
      existentialDeposit: edString(value),
      location: normalizeLocation(value.location),
      isNative: true
    }))
}
