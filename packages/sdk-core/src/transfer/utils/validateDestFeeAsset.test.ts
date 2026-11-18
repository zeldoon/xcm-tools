import type { TAssetInfo } from '@paraspell/assets'
import { describe, expect, it, vi } from 'vitest'

import type { PolkadotApi } from '../../api'
import { UnsupportedOperationError } from '../../errors'
import { validateDestFeeAsset } from './validateDestFeeAsset'

const dot = {
  symbol: 'DOT',
  decimals: 10,
  location: { parents: 1, interior: { Here: null } },
  isFeeAsset: true
} as TAssetInfo
const astr = {
  symbol: 'ASTR',
  decimals: 18,
  location: { parents: 1, interior: { X1: [{ Parachain: 2006 }] } }
} as TAssetInfo
const unknownAsset = {
  symbol: 'XYZ',
  decimals: 12,
  location: { parents: 1, interior: { X1: [{ Parachain: 9999 }] } }
} as TAssetInfo

const createApi = (assets: TAssetInfo[], hasXcmPaymentApi = true) =>
  ({
    getAssets: vi.fn().mockReturnValue(assets),
    hasXcmPaymentApiSupport: vi.fn().mockReturnValue(hasXcmPaymentApi)
  }) as unknown as PolkadotApi<unknown, unknown, unknown>

describe('validateDestFeeAsset', () => {
  it('throws when the destination does not accept the transferred asset as a fee asset', () => {
    const api = createApi([dot, astr])
    expect(() => validateDestFeeAsset(api, 'Hydration', astr, undefined, undefined)).toThrow(
      UnsupportedOperationError
    )
    expect(() => validateDestFeeAsset(api, 'Hydration', astr, undefined, undefined)).toThrow(
      /ASTR is not accepted as an XCM fee asset on Hydration/
    )
  })

  it('passes when the transferred asset is a destination fee asset', () => {
    const api = createApi([dot, astr])
    expect(() => validateDestFeeAsset(api, 'Hydration', dot, undefined, undefined)).not.toThrow()
  })

  it('passes when a separate fee asset is provided', () => {
    const api = createApi([dot, astr])
    expect(() => validateDestFeeAsset(api, 'Hydration', astr, dot, undefined)).not.toThrow()
  })

  it('passes when an overridden multi-asset is provided', () => {
    const api = createApi([dot, astr])
    expect(() =>
      validateDestFeeAsset(api, 'Hydration', astr, undefined, [{ ...dot, isFeeAsset: true }])
    ).not.toThrow()
  })

  it('passes when the destination has no XcmPaymentApi', () => {
    const api = createApi([dot, astr], false)
    expect(() => validateDestFeeAsset(api, 'Hydration', astr, undefined, undefined)).not.toThrow()
  })

  it('passes when the destination registry has no fee asset information', () => {
    const api = createApi([{ ...dot, isFeeAsset: undefined }, astr])
    expect(() => validateDestFeeAsset(api, 'Hydration', astr, undefined, undefined)).not.toThrow()
  })

  it('passes when the asset is not registered on the destination', () => {
    const api = createApi([dot, astr])
    expect(() =>
      validateDestFeeAsset(api, 'Hydration', unknownAsset, undefined, undefined)
    ).not.toThrow()
  })

  it('passes for the native asset of the destination', () => {
    const api = createApi([dot, { ...astr, isNative: true }])
    expect(() => validateDestFeeAsset(api, 'Hydration', astr, undefined, undefined)).not.toThrow()
  })

  it('passes for destinations that also accept unlisted fee assets', () => {
    const api = createApi([dot, astr])
    expect(() =>
      validateDestFeeAsset(api, 'AssetHubPolkadot', astr, undefined, undefined)
    ).not.toThrow()
  })

  it('passes for external and missing destinations', () => {
    const api = createApi([dot, astr])
    expect(() => validateDestFeeAsset(api, 'Ethereum', astr, undefined, undefined)).not.toThrow()
    expect(() => validateDestFeeAsset(api, undefined, astr, undefined, undefined)).not.toThrow()
  })
})
