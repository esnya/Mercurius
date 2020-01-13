import _ from 'lodash';
import { tensor, Tensor, LayersModel } from '@tensorflow/tfjs';
import { normalize, interpolate, quantize } from './transform';
import { Price } from 'mercurius-core/lib/models/Price';
import { loadMetadata } from './model';
import { labelKeys, Labels } from './labels';
import { QuantizedPrice } from './types';

export interface PredictionResult extends Labels {
  timestamp: Date;
}

export async function predictNormalized(
  model: LayersModel,
  normalized: QuantizedPrice[],
): Promise<PredictionResult[]> {
  const { inputSize, timeUnit } = loadMetadata(model);
  const sliced = normalized.slice(-inputSize);
  const last = _.last(normalized);

  if (sliced.length !== inputSize || !last) {
    throw new TypeError(
      `Size of input must be ${inputSize}, not ${sliced.length}`,
    );
  }

  const x = tensor([sliced.map(p => [p.price, p.lottery])]);
  const y = (await model.predict(x)) as Tensor;

  const data = Array.from(await y.data());

  return _(data)
    .chunk(labelKeys.length)
    .map((c, i) => ({
      ...(_(labelKeys)
        .zip(c.map(v => Math.min(Math.max(v, 0), 1)))
        .fromPairs()
        .value() as Labels),
      timestamp: new Date(last.timestamp + (i + 1) * timeUnit.valueOf()),
    }))
    .value();
}

export async function predict(
  model: LayersModel,
  prices: Price[],
): Promise<PredictionResult[]> {
  const { stats, timeUnit } = loadMetadata(model);

  const normalized = normalize(
    interpolate(quantize(prices, timeUnit), stats, timeUnit),
    stats,
  );

  return await predictNormalized(model, normalized);
}
