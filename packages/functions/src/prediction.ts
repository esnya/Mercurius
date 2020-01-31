import firebase from 'firebase-admin';
import _ from 'lodash';
import { Duration, DateTime } from 'luxon';
import {
  loadLayersModel,
  LayersModel,
  tensor,
  Tensor,
} from '@tensorflow/tfjs-node';
import StorageIOHandler from './StorageIOHandler';

const timeDelta = Duration.fromObject({ hours: 3 });
// const outputDuration = Duration.fromObject({ days: 1 });
// const outputSize = outputDuration.valueOf() / timeDelta.valueOf();

export interface Price {
  timestamp: firebase.firestore.Timestamp;
  price: number;
  lottery: boolean;
}

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
      Math.floor(price.timestamp.toMillis() / timeDelta.valueOf()) *
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
  if (!domainLeft) return [];
  const domainRight = _(quantized)
    .map(p => p.timestamp)
    .max();
  if (!domainRight) return [];

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
  if (!maxPrice) return [];

  return quantized.map(price => ({ ...price, price: price.price / maxPrice }));
}

async function predict(
  model: LayersModel,
  prices: Price[],
  inputSize: number,
): Promise<Indices[]> {
  const quantized = quantize(prices);
  const interpolated = interpolate(quantized);
  const normalized = normalize(interpolated).slice(-inputSize);
  const lastTimestamp = _.last(normalized)?.timestamp;
  if (!lastTimestamp || normalized.length !== inputSize) {
    throw new TypeError();
  }

  const predicted = (await model.predict(
    tensor([normalized.map(({ price, lottery }) => [price, lottery])]),
  )) as Tensor;

  return _(await predicted.data())
    .map(n => Math.max(Math.min(n, 1), 0))
    .chunk(2)
    .map(([divestment, purchase], i) => ({
      timestamp: new Date(lastTimestamp + (i + 1) * timeDelta.valueOf()),
      divestment,
      purchase,
    }))
    .value();
}

function isUpdateNeeded(
  updatedAt: firebase.firestore.Timestamp | undefined,
  prices: Price[],
): boolean {
  if (!updatedAt) return true;

  const pricesMax = _(prices)
    .map(p => p.timestamp.toMillis())
    .max();
  if (!pricesMax) return false;

  return updatedAt.toMillis() < pricesMax;
}

export async function predictIndices(
  storage: firebase.storage.Storage,
  itemRef: firebase.firestore.DocumentReference,
): Promise<void> {
  const projectId = itemRef.parent.parent?.id;
  if (!projectId) {
    throw new Error('Failed to get project id');
  }

  const model = await loadLayersModel(
    new StorageIOHandler(
      storage.bucket(),
      `projects/${projectId}/models/benefits`,
    ),
  );
  const inputSize = model.inputs[0].shape[1];
  if (!inputSize) {
    throw new Error('Failed to get input size');
  }

  console.log('Predicting...');
  const query = itemRef
    .collection('prices')
    .orderBy('timestamp', 'desc')
    .endAt(
      DateTime.local()
        .minus(Duration.fromISO('P30D'))
        .toJSDate(),
    );
  const itemSnapshot = await itemRef.get();
  const pricesSnapshot = await query.get();
  const priceSnapshots = pricesSnapshot.docs;

  const prices = priceSnapshots.map(s => s.data() as Price);

  if (!isUpdateNeeded(itemSnapshot.get('updatedAt'), prices)) {
    console.log('skipped');
    return;
  }
  const indices = await predict(model, prices, inputSize);

  await itemRef.update('indices', indices);
  console.log('done');
}
