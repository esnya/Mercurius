import { DateTime, Duration } from 'luxon';
import _ from 'lodash';
import Price from 'mercurius-core/lib/models-next/Price';

export interface PriceStat {
  fluctuationRate?: number;
  minMaxRate: number;
  mean: number;
  min: number;
  max: number;
  closing: Price;
}

const timeUnit = Duration.fromISO('P1D').valueOf();

export function statPricesIn(
  prices: Price[],
  days: number,
  group: number,
  all = false,
): Record<string, PriceStat> {
  const today = DateTime.local().startOf('day');
  const deadline = today.minus(timeUnit * days * group).valueOf();

  const t1 = _(prices)
    .filter(price => price.timestamp >= deadline)
    .groupBy(({ timestamp }): number | string =>
      all
        ? 'all'
        : DateTime.fromMillis(timestamp)
            .startOf('day')
            .valueOf(),
    )
    .mapValues(
      (group): Omit<PriceStat, 'minMaxRate' | 'fluctuationRate'> => {
        const last = _.maxBy(group, ({ timestamp }) => timestamp);
        const mean = _.mean(group.map(p => p.price));
        const min = _.min(group.map(p => p.price));
        const max = _.max(group.map(p => p.price));

        if (
          last === undefined ||
          mean === undefined ||
          min === undefined ||
          max === undefined
        ) {
          throw new Error('Empty group');
        }

        return {
          mean,
          min,
          max,
          closing: last,
        };
      },
    )
    .value();

  return _(t1)
    .mapValues(
      (value, key): PriceStat => {
        const prevTimestamp = Number(key) - timeUnit;
        const prev = t1[`${prevTimestamp}`];

        const minMaxFluctuation = value.max - value.min;
        const tmp = prev && {
          fluctuation: value.closing.price - prev.closing.price,
          duration: value.closing.timestamp - prev.closing.timestamp,
          prevPrice: prev.closing.price,
        };

        return {
          ...value,
          fluctuationRate: !tmp
            ? undefined
            : tmp.prevPrice === 0
            ? 0
            : (tmp.fluctuation / tmp.prevPrice) * (timeUnit / tmp.duration),
          minMaxRate:
            minMaxFluctuation !== 0 ? minMaxFluctuation / value.min : 0,
        };
      },
    )
    .pickBy(a => a !== null)
    .value() as Record<string, PriceStat>;
}

export function statPrices(
  prices: Price[],
): { daily: Record<string, PriceStat>; last30Days: PriceStat } {
  return {
    daily: statPricesIn(prices, 1, 3),
    last30Days: statPricesIn(prices, 30, 1, true).all,
  };
}
