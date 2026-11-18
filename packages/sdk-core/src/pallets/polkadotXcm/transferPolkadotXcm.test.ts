import type { TAsset, TAssetInfo, WithAmount } from '@paraspell/assets'
import { getXcmPallet } from '@paraspell/pallets'
import { type TLocation, Version } from '@paraspell/sdk-common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PolkadotApi } from '../../api'
import type { TPolkadotXcmMethod, TPolkadotXCMTransferOptions, TXcmVersioned } from '../../types'
import { createDestination } from '../../utils'
import { transferPolkadotXcm } from './transferPolkadotXcm'

vi.mock('@paraspell/pallets')

vi.mock('../../utils/location')

const mockApi = {
  deserializeExtrinsics: vi.fn()
} as unknown as PolkadotApi<unknown, unknown, unknown>

const mockLocation: TLocation = {
  parents: 0,
  interior: {
    Here: null
  }
}

const mockAsset: TAsset = {
  id: mockLocation,
  fun: {
    Fungible: 123n
  }
}

const mockVersionedLocation: TXcmVersioned<TLocation> = {
  [Version.V4]: mockLocation
}

const mockVersionedAssets: TXcmVersioned<TAsset[]> = {
  [Version.V4]: [mockAsset]
}

const mockMethod: TPolkadotXcmMethod = 'limited_teleport_assets'

describe('transferPolkadotXcm', () => {
  beforeEach(() => {
    vi.mocked(getXcmPallet).mockReturnValue('PolkadotXcm')
    vi.mocked(createDestination).mockReturnValue(mockLocation)
  })

  const baseOptions = {
    api: mockApi,
    beneficiaryLocation: mockLocation,
    asset: mockAsset,
    assetInfo: { amount: 123n } as WithAmount<TAssetInfo>,
    version: Version.V4
  } as TPolkadotXCMTransferOptions<unknown, unknown, unknown>

  it('should call api.tx[module][method] with correct parameters when fees is undefined', async () => {
    const callSpy = vi.spyOn(mockApi, 'deserializeExtrinsics')

    await transferPolkadotXcm(baseOptions, mockMethod, undefined)

    expect(callSpy).toHaveBeenCalledWith({
      module: 'PolkadotXcm',
      method: mockMethod,
      params: {
        assets: mockVersionedAssets,
        beneficiary: mockVersionedLocation,
        dest: mockVersionedLocation,
        fee_asset_item: 0
      }
    })
  })

  it('should call api.tx[module][method] with correct parameters when fees is "Unlimited"', async () => {
    const callSpy = vi.spyOn(mockApi, 'deserializeExtrinsics')

    await transferPolkadotXcm(baseOptions, mockMethod, 'Unlimited')

    expect(callSpy).toHaveBeenCalledWith({
      module: 'PolkadotXcm',
      method: mockMethod,
      params: {
        assets: mockVersionedAssets,
        beneficiary: mockVersionedLocation,
        dest: mockVersionedLocation,
        fee_asset_item: 0,
        weight_limit: 'Unlimited'
      }
    })
  })

  it('should call api.tx[module][method] with correct parameters when fees is Limited', async () => {
    const callSpy = vi.spyOn(mockApi, 'deserializeExtrinsics')

    await transferPolkadotXcm(baseOptions, mockMethod, { Limited: '1000' })

    expect(callSpy).toHaveBeenCalledWith({
      module: 'PolkadotXcm',
      method: mockMethod,
      params: {
        assets: mockVersionedAssets,
        beneficiary: mockVersionedLocation,
        dest: mockVersionedLocation,
        fee_asset_item: 0,
        weight_limit: { Limited: '1000' }
      }
    })
  })

  it('rejects a reserve transfer whose asset the destination does not accept for XCM fees', async () => {
    const astrLocation: TLocation = { parents: 1, interior: { X1: [{ Parachain: 2006 }] } }
    const deserializeExtrinsics = vi.fn()
    const api = {
      deserializeExtrinsics,
      hasXcmPaymentApiSupport: vi.fn().mockReturnValue(true),
      getAssets: vi.fn().mockReturnValue([
        {
          symbol: 'DOT',
          decimals: 10,
          location: { parents: 1, interior: { Here: null } },
          isFeeAsset: true
        },
        { symbol: 'ASTR', decimals: 18, location: astrLocation }
      ])
    } as unknown as PolkadotApi<unknown, unknown, unknown>

    const options = {
      ...baseOptions,
      api,
      destChain: 'Hydration',
      assetInfo: { symbol: 'ASTR', amount: 123n, location: astrLocation } as WithAmount<TAssetInfo>
    } as TPolkadotXCMTransferOptions<unknown, unknown, unknown>

    await expect(transferPolkadotXcm(options, 'reserve_transfer_assets')).rejects.toThrow(
      'ASTR is not accepted as an XCM fee asset on Hydration'
    )
    expect(deserializeExtrinsics).not.toHaveBeenCalled()
  })
})
