import firebase from 'firebase-admin';
import { simpleConverter } from 'mercurius-core/lib/firestore/converter';
import { Price, PriceConverter } from 'mercurius-core/lib/models/Price';
import _ from 'lodash';
import { DateTime, Duration } from 'luxon';
import { loadLayersModel, LayerModel, tensor, Tensor } from '@tensorflow/tfjs';

const timeDelta = Duration.fromObject({ hours: 3 });
const inputDuration = Duration.fromObject({ days: 7 });
const inputSize = inputDuration.valueOf() / timeDelta.valueOf();
// const outputDuration = Duration.fromObject({ days: 1 });
// const outputSize = outputDuration.valueOf() / timeDelta.valueOf();

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
  const maxTimestamp = _(quantized)
    .map(p => p.timestamp)
    .max();
  if (maxTimestamp === undefined) {
    throw new Error('Array must contain items');
  }
  const rightDateTime = DateTime.fromMillis(maxTimestamp);

  const grouped = _.groupBy(quantized, q => q.timestamp);

  const resampled = _(rightDateTime.minus(inputDuration).valueOf())
    .range(rightDateTime.plus(timeDelta).valueOf(), timeDelta.valueOf())
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
    });

  const interpolated = resampled
    .map(({ timestamp, value }, i) => {
      if (value) {
        return {
          ...value,
          timestamp,
        };
      }

      const left = resampled
        .take(i)
        .dropRightWhile(({ value }) => value !== null)
        .last();
      if (!left || !left.value) return null;

      const right = resampled
        .drop(i + 1)
        .dropWhile(({ value }) => value !== null)
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
  if (!maxPrice) {
    throw new Error();
  }

  return quantized.map(price => ({ ...price, price: price.price / maxPrice }));
}

async function predict(model: LayerModel, prices: Price[]): Promise<Indices[]> {
  const quantized = quantize(prices);
  const interpolated = interpolate(quantized).slice(-inputSize);
  const normalized = normalize(interpolated);
  const lastTimestamp = _.last(normalized)?.timestamp;
  if (!lastTimestamp || normalized.length !== inputSize) {
    throw new TypeError();
  }

  const predicted = (await model.predict(
    tensor([normalized.map(({ price, lottery }) => [price, lottery])]),
  )) as Tensor;

  return _(await predicted.data())
    .chunk(2)
    .map(([divestment, purchase], i) => ({
      timestamp: new Date(lastTimestamp + (i + 1) * timeDelta.valueOf()),
      divestment,
      purchase,
    }))
    .value();
}

export async function predictIndices(
  itemRef: firebase.firestore.DocumentReference,
): Promise<void> {
  const domainLeft = DateTime.local()
    .minus(inputDuration)
    .minus(inputDuration);
  const query = itemRef
    .collection('prices')
    .withConverter(simpleConverter(PriceConverter.cast))
    .orderBy('timestamp', 'asc')
    .startAt(domainLeft.toJSDate());
  const pricesSnapshot = await query.get();
  const priceSnapshots = pricesSnapshot.docs;
  const prices = priceSnapshots.map(s => s.data() as Price);

  const projectId = itemRef.parent.parent?.id;
  if (!projectId) {
    throw new Error();
  }
  const model = await loadLayersModel(`gs://mercurius-6026e.appspot.com/projects/${projectId}/models/benefits`);
  const indices = await predict(model, prices);

  await itemRef.update('indices', indices);
}
