// Contains detailed structure of XCM call construction for Shiden Parachain

import type { TChain } from '@paraspell/sdk-common'
import { Version } from '@paraspell/sdk-common'

import Astar from './Astar'

class Shiden<TApi, TRes, TSigner, TCustomChain extends string = never> extends Astar<
  TApi,
  TRes,
  TSigner,
  TCustomChain
> {
  constructor() {
    super('Shiden', 'shiden', 'Kusama', Version.V5)
  }

  hasChannelFrom<TCustomChain extends string = never>(chain: TChain | TCustomChain): boolean {
    // No open HRMP channels towards Shiden from these chains (checked on the Kusama relay)
    return !['Karura', 'BifrostKusama', 'Basilisk', 'Curio', 'Encointer'].includes(chain)
  }
}

export default Shiden
