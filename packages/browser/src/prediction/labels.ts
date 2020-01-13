import { QuantizedPrice } from './types';
import { Duration } from 'luxon';
import _ from 'lodash';
import { isDefined } from '../utilities/types';

export interface Benefits {
  purchase: number;
  divestment: number;
}

export function benefits(
  interpolated: QuantizedPrice[],
  timeUnit: Duration,
  benefitDuration: Duration,
): Partial<Benefits>[] {
  const n = Math.floor(benefitDuration.valueOf() / timeUnit.valueOf());
  return interpolated.map(({ price }, i) => {
    const past = _(interpolated)
      .take(i - 1)
      .takeRight(n)
      .value();
    const future = _(interpolated)
      .drop(i + 1)
      .take(n)
      .value();
    const next = _.first(future);

    const divestment =
      past.length === n
        ? _(past)
            .map(p => (price - p.price) / p.price)
            .max()
        : undefined;
    const purchase =
      future.length === n
        ? _(future)
            .map(p => (p.price - price) / price)
            .max()
        : undefined;

    return {
      // divestment:
      //   next && divestment && (next.price > price && divestment > 0.25 ? 1 : 0),
      // purchase: purchase && (purchase > 0.5 ? 1 : 0),
      divestment:
        next &&
        divestment &&
        (next.price >= price && divestment > 0.3 ? Math.min(divestment, 1) : 0),
      purchase: purchase && (purchase > 0.3 ? Math.min(purchase, 1) : 0),
    };
  });
}

export interface Changes {
  increase: number;
  decrease: number;
}

export function changes(
  interpolated: QuantizedPrice[],
  th = 0.005,
): Partial<Changes>[] {
  return interpolated
    .map(({ price }, i): number | void => {
      if (price === 0) return 0;

      const next = interpolated[i + 1];
      if (!isDefined(next)) {
        return;
      }

      return (next.price - price) / price;
    })
    .map(change => {
      if (!isDefined(change)) {
        return {};
      }
      const increase = change > th;
      const decrease = change < -th;

      return _.mapValues({ increase, decrease }, b => (b ? 1 : 0));
    });
}

export type Labels = Benefits & Changes;
export const labelKeys: (keyof Labels)[] = [
  'purchase',
  'divestment',

  'increase',
  'decrease',
];

export function getLabels(
  interpolated: QuantizedPrice[],
  timeUnit: Duration,
  benefitDuration: Duration,
  changesThreshold = 0.01,
): Partial<Labels>[] {
  return _.zip(
    benefits(interpolated, timeUnit, benefitDuration),
    changes(interpolated, changesThreshold),
  ).map(([a, b]) => ({
    ...a,
    ...b,
  }));
}
