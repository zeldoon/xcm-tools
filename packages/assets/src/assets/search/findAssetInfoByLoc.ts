import { deepEqual, type TLocation } from '@paraspell/sdk-common'

import { compareLocations } from '../../location'
import type { TAssetInfo } from '../../types'
import { canonicalizeLocation } from '../normalizeLocation'

const NUMERIC_STRING_REGEX = /^(?:\d{1,3}(?:,\d{3})+|\d+)$/

/**
 * Converts integer strings (optionally with thousands separators, e.g. `"1,984"`)
 * into bigints, so that a junction value written as a string compares equal to the
 * same value written as a number.
 */
const normalizeNumericValues = (value: unknown): unknown => {
  if (typeof value === 'string' && NUMERIC_STRING_REGEX.test(value)) {
    return BigInt(value.replace(/,/g, ''))
  }

  if (Array.isArray(value)) return value.map(normalizeNumericValues)

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, normalizeNumericValues(val)])
    )
  }

  return value
}

const toComparableLocation = (location: TLocation): unknown =>
  normalizeNumericValues(canonicalizeLocation(location))

const parseLocationString = (location: string): TLocation | undefined => {
  try {
    const parsed: unknown = JSON.parse(location)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      'parents' in parsed &&
      'interior' in parsed
    ) {
      return parsed as TLocation
    }
  } catch {
    // Not a JSON location, fall back to plain string comparison below
  }
  return undefined
}

export const findAssetInfoByLoc = (
  foreignAssets: TAssetInfo[],
  location: string | TLocation
): TAssetInfo | undefined => {
  const parsedLocation = typeof location === 'string' ? parseLocationString(location) : location

  if (parsedLocation === undefined) {
    return foreignAssets.find(asset => compareLocations(location as string, asset))
  }

  const normalizedLocation = toComparableLocation(parsedLocation)
  return foreignAssets.find(
    asset => asset.location && deepEqual(normalizedLocation, toComparableLocation(asset.location))
  )
}
