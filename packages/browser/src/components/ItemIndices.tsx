import React from 'react';
import {
  LayersModel,
  loadLayersModel,
  tensor,
  Tensor,
  SymbolicTensor,
} from '@tensorflow/tfjs';
import { initializeApp } from '../firebase';
import { simpleConverter } from '../firebase/converters';
import { PriceConverter, Price } from 'mercurius-core/lib/models/Price';
import { assertDefined, assert } from '../utilities/assert';
import _ from 'lodash';
import { Duration, DateTime } from 'luxon';
import memoize from 'lodash/memoize';
import PromiseReader from '../suspense/PromiseReader';
import { createClassFromSpec } from 'react-vega';
import { lite, timeFormat } from '../definitions/chart';
import StaticIOHandler from '../prediction/StaticIOHandler';
import model from '../prediction/model.json';
import weights from '../prediction/weights.bin';

const timeDelta = Duration.fromObject({ hours: 3 });

export interface Indices {
  timestamp: Date;
  divestment: number;
  purchase: number;
}

export interface QuantizedPrice {
  timestamp: number;
  price: number;
  lottery: number;
}

function quantize(prices: Price[]): QuantizedPrice[] {
  const quantized = prices.map(price => ({
    timestamp:
      Math.floor(price.timestamp.getTime() / timeDelta.valueOf()) *
      timeDelta.valueOf(),
    price: price.price,
    lottery: price.lottery ? 1 : 0,
  }));
  return quantized;
}

function interpolate(quantized: QuantizedPrice[]): QuantizedPrice[] {
  const grouped = _.groupBy(quantized, q => q.timestamp);

  const domainLeft = _(quantized)
    .map(p => p.timestamp)
    .min();
  assertDefined(domainLeft);
  const domainRight = _(quantized)
    .map(p => p.timestamp)
    .max();
  assertDefined(domainRight);

  const resampled = _(domainLeft)
    .range(domainRight + timeDelta.valueOf(), timeDelta.valueOf())
    .map(timestamp => {
      const group = grouped[timestamp];

      if (!group || group.length == 0) {
        return {
          timestamp,
          value: null,
        };
      }

      return {
        timestamp,
        value: {
          price: _.meanBy(group, p => p.price),
          lottery: _.meanBy(group, p => p.lottery),
        },
      };
    })
    .value();

  const interpolated = _(resampled)
    .map(({ timestamp, value }, i) => {
      if (value) {
        return {
          ...value,
          timestamp,
        };
      }

      const left = _(resampled)
        .take(i)
        .dropRightWhile(({ value }) => value === null)
        .last();
      if (!left || !left.value) return null;

      const right = _(resampled)
        .drop(i + 1)
        .dropWhile(({ value }) => value === null)
        .first();
      if (!right || !right.value) return null;

      const d = right.timestamp - left.timestamp;
      const leftRate = (right.timestamp - timestamp) / d;
      const rightRate = 1 - leftRate;

      return {
        timestamp,
        price: leftRate * left.value.price + rightRate * right.value.price,
        lottery:
          leftRate * left.value.lottery + rightRate * right.value.lottery,
      };
    })
    .dropWhile(p => !p)
    .takeWhile(p => p)
    .value() as { timestamp: number; price: number; lottery: number }[];

  return interpolated;
}

function normalize(quantized: QuantizedPrice[]): QuantizedPrice[] {
  const maxPrice = _(quantized)
    .map(p => p.price)
    .max();
  assertDefined(maxPrice);

  return quantized.map(price => ({ ...price, price: price.price / maxPrice }));
}

const app = initializeApp();
const firestore = app.then(a => a.firestore());

const model$ = loadLayersModel(new StaticIOHandler(model, weights));

async function getPrices(projectId: string, itemId: string): Promise<Price[]> {
  const pricesRef = (await firestore)
    .collection(`projects/${projectId}/items/${itemId}/prices`)
    .withConverter(simpleConverter(PriceConverter.cast));
  const query = pricesRef.orderBy('timestamp', 'desc').endAt(
    DateTime.local()
      .minus(Duration.fromISO('P30D'))
      .toJSDate(),
  );
  return (await query.get()).docs.map(s => s.data());
}

async function getIndices(
  projectId: string,
  itemId: string,
): Promise<Indices[]> {
  const model = await model$;
  // console.log(model);

  const inputShape = (model.input as SymbolicTensor).shape;
  const inputSize = inputShape[1];
  assertDefined(inputSize);

  const outputShape = (model.output as SymbolicTensor).shape;
  const outputSize = outputShape[1];
  assertDefined(outputSize);

  // console.log({ inputSize, outputSize });

  const prices = await getPrices(projectId, itemId);

  const quantized = quantize(prices);
  const interpolated = interpolate(quantized);
  const normalized = normalize(interpolated).slice(-inputSize);
  // console.log({ quantized, interpolated, normalized });
  assert(normalized.length === inputSize);

  const lastTimestamp = _.last(normalized)?.timestamp;
  assertDefined(lastTimestamp);

  const x = tensor(normalized.map(p => [p.price, p.lottery])).reshape([
    1,
    inputSize,
    2,
  ]);
  const y = (await model.predict(x)) as Tensor;
  return _(await y.data())
    .map(n => Math.max(Math.min(n, 1), 0))
    .chunk(2)
    .map(([divestment, purchase], i) => ({
      timestamp: new Date(lastTimestamp + (i + 1) * timeDelta.valueOf()),
      divestment,
      purchase,
    }))
    .value();
}
const getIndicesReader = memoize(
  (projectId, itemId) => new PromiseReader(() => getIndices(projectId, itemId)),
);

const VegaChart = createClassFromSpec({
  mode: 'vega-lite',
  spec: {
    ...lite,
    selection: {
      pts: { type: 'multi', fields: ['series'] },
    },
    data: { name: 'data' },
    mark: {
      type: 'line',
      point: true,
    },
    encoding: {
      x: {
        field: 'timestamp',
        type: 'temporal',
        axis: {
          ...timeFormat,
          labelAngle: 90,
        },
      },
      y: {
        field: 'rate',
        type: 'quantitative',
        scale: {
          domain: [0, 1],
        },
      },
      color: {
        field: 'series',
        type: 'nominal',
      },
      opacity: {
        condition: {
          selection: 'pts',
          value: 1,
        },
        value: 0.25,
      },
    },
  },
});

export default function ItemIndices({
  projectId,
  itemId,
}: {
  projectId: string;
  itemId: string;
}): JSX.Element {
  const indices = getIndicesReader(projectId, itemId).read();

  const data = {
    data: indices
      .map(({ timestamp, divestment, purchase }) => [
        { timestamp, rate: purchase, series: '買い指数' },
        { timestamp, rate: divestment, series: '売り指数' },
      ])
      .flat(),
  };

  return <VegaChart data={data} />;
}
