import Item, { ItemPriceStat } from 'mercurius-core/lib/models-next/Item';
import { timestampGetters } from './path';
import { DateTime } from 'luxon';
import PriceIndex from 'mercurius-core/lib/models-next/PriceIndex';

export function getIndices({ indices }: Item): PriceIndex | undefined | null {
  const nextTimeUnit = timestampGetters
    .nextTimeUnit(DateTime.local())
    .valueOf();
  return indices ? indices[`${nextTimeUnit}`] : null;
}

export function getDaily({ daily }: Item): ItemPriceStat | undefined | null {
  const today = timestampGetters.today(DateTime.local()).valueOf();
  return daily ? daily[`${today}`] : null;
}
