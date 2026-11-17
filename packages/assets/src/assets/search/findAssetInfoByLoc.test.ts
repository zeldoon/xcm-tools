import { describe, expect, it } from 'vitest'

import type { TAssetInfo } from '../../types'
import { findAssetInfoByLoc } from './findAssetInfoByLoc'

const relayNative: TAssetInfo = {
  symbol: 'DOT',
  decimals: 10,
  existentialDeposit: '1000',
  location: { parents: 1, interior: { Here: null } }
}

const usdt: TAssetInfo = {
  symbol: 'USDT',
  assetId: '1984',
  decimals: 6,
  existentialDeposit: '1000',
  location: {
    parents: 1,
    interior: {
      X3: [{ Parachain: 1000 }, { PalletInstance: 50 }, { GeneralIndex: '1,984' }]
    }
  }
}

const usdc: TAssetInfo = {
  symbol: 'USDC',
  assetId: '1337',
  decimals: 6,
  existentialDeposit: '1000',
  location: {
    parents: 1,
    interior: {
      X3: [{ Parachain: 1000 }, { PalletInstance: 50 }, { GeneralIndex: 1337 }]
    }
  }
}

const assets = [relayNative, usdt, usdc]

describe('findAssetInfoByLoc', () => {
  it('matches the canonical { Here: null } object form', () => {
    const result = findAssetInfoByLoc(assets, {
      parents: 1,
      interior: { Here: null }
    })
    expect(result).toBe(relayNative)
  })

  it('normalizes the "Here" shorthand object form to { Here: null }', () => {
    const result = findAssetInfoByLoc(assets, {
      parents: 1,
      interior: 'Here'
    })
    expect(result).toBe(relayNative)
  })

  it('still applies comma-tolerant string comparison', () => {
    const result = findAssetInfoByLoc(
      assets,
      JSON.stringify({
        parents: 1,
        interior: {
          X3: [{ Parachain: 1000 }, { PalletInstance: 50 }, { GeneralIndex: '1984' }]
        }
      })
    )
    expect(result).toBe(usdt)
  })

  it('returns undefined when nothing matches', () => {
    const result = findAssetInfoByLoc(assets, {
      parents: 2,
      interior: 'Here'
    })
    expect(result).toBeUndefined()
  })

  it('matches bigint junction values against numeric asset locations', () => {
    const result = findAssetInfoByLoc(assets, {
      parents: 1,
      interior: {
        X3: [{ Parachain: 1000 }, { PalletInstance: 50 }, { GeneralIndex: 1337n }]
      }
    })
    expect(result).toBe(usdc)
  })

  it('matches a JSON string location regardless of whitespace and key order', () => {
    const pretty = JSON.stringify({ interior: { Here: null }, parents: 1 }, null, 2)
    expect(findAssetInfoByLoc(assets, pretty)).toBe(relayNative)
  })

  it('matches a JSON string location that uses the "Here" shorthand', () => {
    expect(findAssetInfoByLoc(assets, '{"parents":1,"interior":"Here"}')).toBe(relayNative)
  })

  it('matches string junction values against numeric asset locations', () => {
    const asString = JSON.stringify({
      parents: 1,
      interior: {
        X3: [{ Parachain: 1000 }, { PalletInstance: 50 }, { GeneralIndex: '1337' }]
      }
    })
    const withSeparators = JSON.stringify({
      parents: 1,
      interior: {
        X3: [{ Parachain: '1,000' }, { PalletInstance: '50' }, { GeneralIndex: '1,337' }]
      }
    })
    expect(findAssetInfoByLoc(assets, asString)).toBe(usdc)
    expect(findAssetInfoByLoc(assets, withSeparators)).toBe(usdc)
  })

  it('matches a JSON string location in XCM V3 X1 object form', () => {
    const parachainAsset: TAssetInfo = {
      symbol: 'ASTR',
      decimals: 18,
      existentialDeposit: '1000',
      location: { parents: 1, interior: { X1: [{ Parachain: 2006 }] } }
    }
    const v3 = JSON.stringify({ parents: 1, interior: { X1: { Parachain: 2006 } } })
    expect(findAssetInfoByLoc([...assets, parachainAsset], v3)).toBe(parachainAsset)
  })

  it('matches object locations with string junction values', () => {
    const result = findAssetInfoByLoc(assets, {
      parents: 1,
      interior: {
        X3: [{ Parachain: 1000 }, { PalletInstance: 50 }, { GeneralIndex: '1,337' }]
      }
    })
    expect(result).toBe(usdc)
  })

  it('does not match a different JSON string location', () => {
    expect(findAssetInfoByLoc(assets, '{"parents":0,"interior":"Here"}')).toBeUndefined()
  })

  it('falls back to plain string comparison for non-JSON input', () => {
    expect(findAssetInfoByLoc(assets, 'not a location')).toBeUndefined()
  })
})
