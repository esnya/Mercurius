import moment, { duration } from 'moment';
import _ from 'lodash';
import Price from './Price';

export default interface PriceStats {
  max: number;
  min: number;
  begin: number;
  end: number;

  fluctuationRate: number;
  average: number;
  stdDev: number;

  endByFluctuationRate: number;
  variationRate?: number;
}

function domainFilter(domain: [number, number]): (value: number) => boolean {
  return (value: number): boolean => domain[0] <= value && value <= domain[1];
}

export function getDomain(timeRange: number): [number, number] {
  return [
    moment()
      .subtract(timeRange, 'days')
      .startOf('days')
      .valueOf(),
    moment()
      .endOf('days')
      .valueOf(),
  ];
}

export function calculate(
  prices: Price[],
  timeRange: number,
): Readonly<PriceStats> | null {
  const domain = getDomain(timeRange);

  const filtered = _(prices)
    .map(({ timestamp, ...others }) => ({
      ...others,
      timestamp: timestamp.toMillis(),
    }))
    .filter(({ timestamp }) => domainFilter(domain)(timestamp))
    .sortBy(({ timestamp }) => timestamp)
    .value();

  const count = filtered.length;
  if (count === 0) return null;

  const begin = filtered[0].price;
  const endPrice = filtered[count - 1];
  const end = endPrice.price;

  const { min, max, sum, sumOfSquares } = filtered.reduce(
    (prev, { price }) => ({
      max: Math.max(prev.max, price),
      min: Math.min(prev.min, price),
      sum: prev.sum + price,
      sumOfSquares: prev.sumOfSquares + Math.pow(price, 2),
    }),
    {
      max: begin,
      min: begin,
      sum: 0,
      sumOfSquares: 0,
    },
  );

  const average = sum / count;

  const verbose = sumOfSquares - Math.pow(average, 2);
  const stdDev = Math.sqrt(verbose);
  const fluctuation = max - min;
  const fluctuationRate = fluctuation / min;
  const endByFluctuationRate = fluctuation ? (end - min) / fluctuation : 1;

  const lastDayDomain: [number, number] = [
    domain[0],
    moment(endPrice.timestamp)
      .subtract(1, 'days')
      .endOf('day')
      .valueOf(),
  ];
  const lastDayPrice = _(filtered)
    .filter(({ timestamp }) => domainFilter(lastDayDomain)(timestamp))
    .first();
  const variationDuration =
    lastDayPrice && endPrice.timestamp - lastDayPrice.timestamp;
  const variation = lastDayPrice && endPrice.price - lastDayPrice.price;
  const variationPerDay =
    variation &&
    variationDuration &&
    variation / (variationDuration / duration(1, 'day').asMilliseconds());
  const variationRate =
    variationPerDay && lastDayPrice && variationPerDay / lastDayPrice.price;

  return {
    begin,
    end,
    min,
    max,

    average,
    stdDev,
    fluctuationRate,
    endByFluctuationRate,

    variationRate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPriceStats(value: any): value is PriceStats {
  return (
    typeof value === 'object' &&
    [
      'begin',
      'end',
      'min',
      'max',
      'average',
      'stdDev',
      'fluctuationRate',
      'endByFluctuationRate',
    ].every(key => typeof value[key] === 'number') &&
    ['variationRate']
      .map(key => typeof value[key])
      .every(t => t === 'undefined' || t === 'number')
  );
}
