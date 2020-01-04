import _ from 'lodash';
import { tensor, Tensor, LayersModel } from '@tensorflow/tfjs';
import { decode, encode } from './prep';
import { Price } from 'mercurius-core/lib/models/Price';
import { loadMetadata } from './model';

export async function predict(
  model: LayersModel,
  prices: Price[],
): Promise<Price[]> {
  const { stats, inputSize } = loadMetadata(model);

  const encoded = encode(prices, stats).slice(-inputSize);
  const last = _.last(encoded);

  if (encoded.length !== inputSize || !last) {
    throw new TypeError(
      `Size of input must be ${inputSize}, not ${encoded.length}`,
    );
  }

  const x = tensor([encoded.map(p => [p.price, p.lottery])]);
  const y = (await model.predict(x)) as Tensor;

  const data = Array.from(await y.data());

  return decode(data, last.timestamp, stats);
}
