import _ from 'lodash';
import { Price } from 'mercurius-core/lib/models/Price';
import { MinMax } from 'mercurius-core/lib/models/ModelMetadata';
import { assertDefined } from '../utilities/assert';
import { isDefined } from '../utilities/types';
import { Duration } from 'luxon';
import { QuantizedPrice, Stats } from './types';

export function minMax(values: number[]): MinMax {
  const min = _.min(values);
  assertDefined(min);

  const max = _.max(values);
  assertDefined(max);

  return {
    min,
    max,
  };
}

export function quantize(
  prices: Price[],
  timeUnit: Duration,
): QuantizedPrice[] {
  return prices.map(p => ({
    timestamp:
      Math.floor(p.timestamp.getTime() / timeUnit.valueOf()) *
      timeUnit.valueOf(),
    price: p.price,
    lottery: p.lottery ? 1 : 0,
  }));
}

export function keepStats(quantized: QuantizedPrice[]): Stats {
  return {
    timestamp: minMax(quantized.map(p => p.timestamp)),
    price: minMax(quantized.map(p => p.price)),
  };
}

export function group(
  quantized: QuantizedPrice[],
): Record<string, QuantizedPrice> {
  return _(quantized)
    .groupBy(p => p.timestamp)
    .mapValues((value, key) =>
      isDefined(value)
        ? {
            timestamp: Number(key),
            price: _.mean(value.map(p => p.price)),
            lottery: _.mean(value.map(p => p.lottery)),
          }
        : value,
    )
    .value();
}

export function interpolate(
  quantized: QuantizedPrice[],
  stats: Stats,
  timeUnit: Duration,
): QuantizedPrice[] {
  const grouped = group(quantized);

  const left = _(quantized)
    .map(p => p.timestamp)
    .min();
  assertDefined(left);

  const right = _(quantized)
    .map(p => p.timestamp)
    .max();
  assertDefined(right);

  return _(left)
    .range(right + timeUnit.valueOf(), timeUnit.valueOf())
    .map(t => {
      const found = grouped[t];
      if (found) {
        return found;
      }

      const l = _(0)
        .rangeRight(t, timeUnit.valueOf())
        .find(l => l in grouped);
      if (!isDefined(l)) return;

      const r = _(t)
        .range(right + timeUnit.valueOf(), timeUnit.valueOf())
        .drop(1)
        .find(r => r in grouped);
      if (!isDefined(r)) return;

      const lValue = grouped[l];
      const rValue = grouped[r];
      const rRate = (t - l) / (r - l);
      const lRate = 1 - rRate;

      return {
        timestamp: t,
        price: lValue.price * lRate + rValue.price * rRate,
        lottery: lValue.lottery * lRate + rValue.lottery * rRate,
      };
    })
    .dropWhile(_.negate(isDefined))
    .takeWhile(isDefined)
    .filter(isDefined)
    .value();
}

export function normalize(
  interpolated: QuantizedPrice[],
  stats: Stats,
): QuantizedPrice[] {
  return interpolated.map(p => ({
    ...p,
    price: (p.price - stats.price.min) / (stats.price.max - stats.price.min),
  }));
}

export function denormalize(
  normalized: QuantizedPrice[],
  stats: Stats,
): QuantizedPrice[] {
  return normalized.map(p => ({
    ...p,
    price: p.price * (stats.price.max - stats.price.min) - stats.price.min,
  }));
}
