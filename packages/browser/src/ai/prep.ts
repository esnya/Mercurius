import _ from 'lodash';
import { NormalizedPrice, timeStep } from './types';
import { Price } from 'mercurius-core/lib/models/Price';
import { Stats, MinMax } from 'mercurius-core/lib/models/ModelMetadata';
import { assertIsDefined } from '../utilities/assert';
import { isDefined } from '../utilities/types';

function minMax(values: number[]): MinMax {
  const min = _.min(values);
  assertIsDefined(min);

  const max = _.max(values);
  assertIsDefined(max);

  return {
    min,
    max,
  };
}

export function calculateStats(prices: Price[]): Stats {
  return {
    timestamp: minMax(prices.map(p => p.timestamp.getTime())),
    price: minMax(prices.map(p => p.price)),
  };
}

export function normalize(
  { price, timestamp, lottery }: Price,
  stats: Stats,
): NormalizedPrice {
  return {
    timestamp: Math.floor(timestamp.getTime() / timeStep),
    price: Math.log(
      (price - stats.price.min) / (stats.price.max - stats.price.min) + 1,
    ),
    lottery: lottery ? 1 : 0,
  };
}

export interface Grouped {
  group: {
    [timestamp: string]: NormalizedPrice;
  };
  min: number;
  max: number;
}

export function group(prices: NormalizedPrice[]): Grouped {
  const group = _(prices)
    .groupBy(p => p.timestamp)
    .mapValues(p => _(p))
    .mapValues(p => ({
      timestamp: p.map(p => p.timestamp).mean(),
      price: p.map(p => p.price).mean(),
      lottery: p.map(p => p.lottery).mean(),
    }))
    .value();

  const timestamps = prices.map(p => p.timestamp);
  const { min, max } = minMax(timestamps);

  return {
    group,
    min,
    max,
  };
}

export function linearInterpolate(
  timestamp: number,
  { group, min, max }: Grouped,
): NormalizedPrice | null {
  const found = group[`${timestamp}`];
  if (found) {
    return found;
  }

  let left = timestamp;
  while (left >= min && !(`${left}` in group)) left--;
  let right = timestamp;
  while (right <= max && !(`${right}` in group)) right++;

  if (left < min || right > max) return null;

  const leftValue = group[left];
  const rightValue = group[right];

  const duration = rightValue.timestamp - leftValue.timestamp;
  const rightRate = (timestamp - leftValue.timestamp) / duration;
  const leftRate = 1 - rightRate;

  return {
    timestamp,
    price: leftValue.price * leftRate + rightValue.price * rightRate,
    lottery: leftValue.lottery * leftRate + rightValue.lottery * rightRate,
  };
}

export function encode(prices: Price[], stats: Stats): NormalizedPrice[] {
  const normalized = prices.map(p => normalize(p, stats));
  const grouped = group(normalized);
  const interpolated = _(grouped.min)
    .range(grouped.max + 1)
    .map(timestamp => linearInterpolate(timestamp, grouped))
    .dropWhile(_.isNull)
    .takeWhile(_.isObject)
    .filter(isDefined)
    .value();

  return interpolated;
}

export function decode(
  predicted: number[],
  lastTimestamp: number,
  stats: Stats,
): Price[] {
  return predicted.map((price, i) => ({
    timestamp: new Date((lastTimestamp + i + 1) * timeStep),
    price:
      (Math.exp(price) - 1) * (stats.price.max - stats.price.min) +
      stats.price.min,
    lottery: false,
  }));
}
