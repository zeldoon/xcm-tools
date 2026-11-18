import { Version } from '@paraspell/sdk-common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getChain } from '../../utils'
import type Shiden from './Shiden'

describe('Shiden', () => {
  let chain: Shiden<unknown, unknown, unknown>

  beforeEach(() => {
    vi.resetAllMocks()
    chain = getChain<unknown, unknown, unknown, 'Shiden'>('Shiden')
  })

  it('should initialize with correct values', () => {
    expect(chain.chain).toBe('Shiden')
    expect(chain.info).toBe('shiden')
    expect(chain.ecosystem).toBe('Kusama')
    expect(chain.version).toBe(Version.V5)
  })

  it('has no channel from chains without an open HRMP channel to Shiden', () => {
    expect(chain.hasChannelFrom('AssetHubKusama')).toBe(true)
    expect(chain.hasChannelFrom('BifrostKusama')).toBe(false)
    expect(chain.hasChannelFrom('Karura')).toBe(false)
    expect(chain.hasChannelFrom('Basilisk')).toBe(false)
    expect(chain.canReceiveFrom('Karura')).toBe(true)
  })
})
