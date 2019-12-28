import React, { useRef, useEffect, Ref, RefObject, useState } from 'react';
import {
  Container,
  Segment,
  Message,
  Dimmer,
  Loader,
  Card,
} from 'semantic-ui-react';
import { useParams } from 'react-router-dom';
import { useQuerySnapshot } from '../../hooks/useSnapshot';
import { Query, Timestamp } from '../../firebase/types';
import { DateTime, Duration } from 'luxon';
import { isFailed, isSucceeded, isDefined } from '../../utilities/types';
import useAsyncEffect from '../../hooks/useAsyncEffect';
import { render, Point2D } from '@tensorflow/tfjs-vis';
import { NonEmptySnapshot } from '../../firebase/snapshot';
import _ from 'lodash';

interface Item {
  name: string;
}

interface Price {
  timestamp: DateTime;
  price: number;
  lottery: boolean;
}

const domain = [
  DateTime.local().minus(Duration.fromISO('P30D')),
  DateTime.local(),
];

function useContainer<T extends HTMLElement>(
  rootRef: RefObject<T>,
  callback: (container: HTMLDivElement) => void,
  dependsOn: any[],
): void {
  const root = rootRef.current;

  useEffect((): void | (() => void) => {
    if (!root) return;
    const div = document.createElement('div');
    root.append(div);

    callback(div);

    return (): void => div.remove();
  }, [root, ...dependsOn]);
}

interface ReducableStats {
  max: number;
  min: number;
  sum: number;
  count: number;
}

interface Stats extends ReducableStats {
  avg: number;
}

type MapValueTypes<T extends {}, U> = {
  [K in keyof T]: U;
};

type StatsOf<T extends {}> = {
  [K in keyof T]: Stats;
};

type NumbersOf<T extends {}> = {
  [K in keyof T]: number;
};

function toNumbers<T extends {}>(value: T): NumbersOf<T> {
  return _.mapValues(value, (value): number => {
    if (value instanceof DateTime) return value.toMillis();
    if (typeof value === 'boolean') return value ? 1 : 0;

    const number = Number(value);
    if (Number.isNaN(number)) {
      throw new TypeError(`Failed to convert into number: ${value}`);
    }

    return number;
  });
}

function calculateStats<T extends {}>(values: NumbersOf<T>[]): StatsOf<T> {
  const first = _.first(values);
  if (!first) throw new Error('Failed to calculate stats of empty array');

  const initial = _.mapValues(
    first,
    (value): ReducableStats => ({
      max: value,
      min: value,
      sum: 0,
      count: 0,
    }),
  );

  const stats = values.reduce(
    (prev, value): MapValueTypes<T, ReducableStats> =>
      _.mapValues(
        value,
        (value, key): ReducableStats => ({
          max: Math.max(prev[key as keyof StatsOf<T>].max, value),
          min: Math.min(prev[key as keyof StatsOf<T>].min, value),
          sum: prev[key as keyof StatsOf<T>].sum + value,
          count: prev[key as keyof StatsOf<T>].count + 1,
        }),
      ),
    initial,
  );

  return _.mapValues(
    stats,
    (value, key): Stats => ({
      ...value,
      avg: value.sum / value.count,
    }),
  );
}

function normalize<T extends {}>(
  value: NumbersOf<T>,
  stats: StatsOf<T>,
): NumbersOf<T> {
  return _.mapValues(value, (value, key): number => {
    const { min, max } = stats[key as keyof StatsOf<T>];

    return (value - min) / (max - min);
  });
}

function toPoint2D<T extends {}>(
  xKey: keyof T,
  values: NumbersOf<T>[],
): [Point2D[][], string[]] {
  const first = _.first(values);
  if (!first) return [[], []];

  return _(first)
    .keys()
    .filter(key => key !== xKey)
    .map((key): [Point2D[], string] => [
      values.map(
        (value): Point2D => ({
          x: value[xKey],
          y: value[key as keyof NumbersOf<T>],
        }),
      ),
      key,
    ])
    .unzip()
    .value() as [Point2D[][], string[]];
}

function ScatterPlot<T extends {}>({
  xKey,
  values,
}: {
  xKey: keyof NumbersOf<T>;
  values: NumbersOf<T>[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useContainer(
    ref,
    container => {
      const [points, series] = toPoint2D(xKey, values);
      render.scatterplot(container, {
        values: points,
        series,
      });
    },
    [xKey, values],
  );

  return <div ref={ref} />;
}

const hourInMillis = Duration.fromISO('PT1H').valueOf();

export default function AI(): JSX.Element {
  const { projectId, itemId } = useParams();

  const [calculated, setCalculated] = useState<{
    normalized: NumbersOf<Price>[];
    grouped: Record<string, NumbersOf<Price>>;
    corrected: NumbersOf<Price>[];
  }>();

  const sourceSnapshots = useQuerySnapshot(
    (firestore): Query =>
      firestore
        .collection('projects')
        .doc(projectId)
        .collection('items')
        .doc(itemId)
        .collection('prices')
        .orderBy('timestamp', 'desc')
        .endAt(Timestamp.fromDate(domain[0].toJSDate())),
    (snapshot): Price | null => {
      const { timestamp, price, lottery } = snapshot.data();

      if (typeof timestamp.toDate !== 'function') return null;
      if (typeof price !== 'number') return null;

      return {
        timestamp: DateTime.fromJSDate(timestamp.toDate()),
        price,
        lottery: Boolean(lottery),
      };
    },
  );

  useEffect(
    _.throttle((): void => {
      // if (!isSucceeded(sourceSnapshots) || sourceSnapshots.length === 0) return;
      // const timestamps = sourceSnapshots.map(({ data }) =>
      //   data.timestamp.toMillis(),
      // );
      // const prices = sourceSnapshots.map(({ data }) => data.price);
      // const lotteries = sourceSnapshots.map(({ data }) =>
      //   data.lottery ? 1 : 0,
      // );
      // const timestampsMin = _.min(timestamps) ?? NaN;
      // const timestampsMax = _.max(timestamps) ?? NaN;
      // const pricesMin = _.min(prices) ?? NaN;
      // const pricesMax = _.max(prices) ?? NaN;
      // const normalizedTimestamps = timestamps.map(timestamp =>
      //   Math.floor((timestamp - timestampsMin) / hourInMillis),
      // );
      // const normalizedPrices = prices.map(
      //   price => (price - pricesMin) / (pricesMax - pricesMin),
      // );
      // const normalized: NumbersOf<Price>[] = _.zip(
      //   normalizedTimestamps,
      //   normalizedPrices,
      //   lotteries,
      // ).map(([timestamp, price, lottery]) => ({
      //   timestamp,
      //   price,
      //   lottery,
      // })) as any;
      // const grouped = _(normalized)
      //   .groupBy(({ timestamp }) => timestamp)
      //   .mapValues((group, key) => ({
      //     timestamp: Number(key),
      //     price: _(group)
      //       .map(({ price }) => price)
      //       .mean(),
      //     lottery:
      //       _(group)
      //         .map(({ lottery }) => lottery)
      //         .max() ?? 0,
      //   }))
      //   .value();
      // const corrected = _(timestampsMax - timestampsMin)
      //   .range()
      //   .map(timestamp => {
      //     const hit = grouped[`${timestamp}`];
      //     if (hit) {
      //       return hit;
      //     }
      //     const rightIndex = normalizedTimestamps.findIndex(t => t > timestamp);
      //     if (rightIndex < 0) return null;
      //     const leftIndex = _.findLastIndex(
      //       normalizedTimestamps,
      //       t => t < timestamp,
      //     );
      //     if (leftIndex < 0) return null;
      //     const rightTimestamp = normalizedTimestamps[rightIndex];
      //     const leftTimestamp = normalizedTimestamps[leftIndex];
      //     const duration = rightTimestamp - leftTimestamp;
      //     const rightRate = (timestamp - leftTimestamp) / duration;
      //     const leftRate = 1 - rightRate;
      //     return {
      //       timestamp,
      //       price:
      //         normalizedPrices[leftIndex] * leftRate +
      //         normalizedPrices[rightIndex] * rightRate,
      //       lottery:
      //         lotteries[leftIndex] * leftRate +
      //         lotteries[rightIndex] * rightRate,
      //     };
      //   })
      //   .dropWhile(_.negate(isDefined))
      //   .takeWhile(isDefined)
      //   .filter(isDefined)
      //   .value();
      // setCalculated({
      //   normalized,
      //   grouped,
      //   corrected,
      // });
    }, 1000),
    [sourceSnapshots],
  );

  if (!sourceSnapshots) {
    return (
      <Dimmer active>
        <Loader />
      </Dimmer>
    );
  }

  if (isFailed(sourceSnapshots)) {
    return (
      <Container>
        <Message negative>{sourceSnapshots.toString()}</Message>
      </Container>
    );
  }

  if (!calculated)
    return (
      <Dimmer active>
        <Loader />
      </Dimmer>
    );

  const { normalized, grouped, corrected } = calculated;

  return (
    <Container>
      <Card fluid>
        <Card.Content>
          <h1>Corrected</h1>
        </Card.Content>
        <ScatterPlot xKey="timestamp" values={corrected} />
      </Card>
      <Card fluid>
        <Card.Content>
          <h1>Grouped</h1>
        </Card.Content>
        <ScatterPlot
          xKey="timestamp"
          values={_(grouped)
            .toPairs()
            .filter((pair): pair is [string, NumbersOf<Price>] =>
              pair.every(isDefined),
            )
            .map(([hours, value]) => ({ ...value, timestamp: Number(hours) }))
            .value()}
        />
      </Card>
      <Card fluid>
        <Card.Content>
          <h1>Normalized</h1>
        </Card.Content>
        <ScatterPlot xKey="timestamp" values={normalized} />
      </Card>
    </Container>
  );
}
