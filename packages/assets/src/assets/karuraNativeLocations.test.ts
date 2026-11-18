// Karura's CurrencyIdConvert maps these tokens to locations on their reserve chains
// (runtime/karura/src/xcm_config.rs). The registry must use the same locations.

import { describe, expect, it } from 'vitest'

import { findAssetInfo } from './search'

const generalKey = (data: string) => ({
  length: 2,
  data: data.padEnd(66, '0')
})

describe('Karura native token locations', () => {
  it.each([
    ['BNC', 2001, '0x0001'],
    ['VSKSM', 2001, '0x0404'],
    ['KINT', 2092, '0x000c'],
    ['KBTC', 2092, '0x000b']
  ])('%s resolves from its XCM location on parachain %i', (symbol, paraId, key) => {
    const location = {
      parents: 1,
      interior: { X2: [{ Parachain: paraId }, { GeneralKey: generalKey(key) }] }
    }

    expect(findAssetInfo('Karura', { location }, null)?.symbol).toBe(symbol)
    expect(findAssetInfo('Karura', { symbol }, null)?.location).toEqual(location)
  })
})
