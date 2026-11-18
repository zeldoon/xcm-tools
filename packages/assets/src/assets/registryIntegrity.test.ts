// Sanity checks on the bundled asset registry (assets.json)

import { CHAINS, deepEqual } from '@paraspell/sdk-common'
import { describe, expect, it } from 'vitest'

import { getAssets } from './assets'
import { findAssetInfo } from './search'

const USDT_LOCATION = {
  parents: 1,
  interior: { X3: [{ Parachain: 1000 }, { PalletInstance: 50 }, { GeneralIndex: 1984 }] }
}

describe('asset registry integrity', () => {
  it('does not register two assets with the same location on one chain', () => {
    const duplicates: string[] = []

    CHAINS.forEach(chain => {
      const assets = getAssets(chain).filter(asset => asset.location)
      assets.forEach((asset, i) => {
        assets.slice(i + 1).forEach(other => {
          if (deepEqual(asset.location, other.location)) {
            duplicates.push(`${chain}: ${asset.symbol} / ${other.symbol}`)
          }
        })
      })
    })

    expect(duplicates).toEqual([])
  })

  it('resolves USDT on Centrifuge to ForeignAsset 1 (USDT), not the LocalAsset USD', () => {
    const byLocation = findAssetInfo('Centrifuge', { location: USDT_LOCATION }, null)
    expect(byLocation?.symbol).toBe('USDT')
    expect(byLocation?.existentialDeposit).toBe('10000')

    const byId = findAssetInfo('Centrifuge', { id: '1' }, null)
    expect(byId?.symbol).toBe('USDT')

    expect(findAssetInfo('Centrifuge', { symbol: 'USD' }, null)).toBeNull()
  })
})
