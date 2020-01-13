import _ from 'lodash';
import {
  tensor,
  SymbolicTensor,
  ModelFitArgs,
  LayersModel,
} from '@tensorflow/tfjs';
import { interpolate, quantize, keepStats, normalize } from './transform';
import { getLabels, labelKeys, Labels } from './labels';
import { Price } from 'mercurius-core/lib/models/Price';
import { assertIsDefined, assert } from '../utilities/assert';
import View from './view';
import { Duration } from 'luxon';
import { isDefined } from '../utilities/types';
import { QuantizedPrice } from './types';
import { predictNormalized } from './predict';

export async function fit(
  model: LayersModel,
  prices: Price[],
  timeUnit: Duration,
  benefitDuration: Duration,
  options?: ModelFitArgs,
  viewContainer?: HTMLElement,
): Promise<LayersModel> {
  const view = viewContainer && new View(viewContainer);

  view?.modelSummary(model);

  const { shape: inputShape } = model.input as SymbolicTensor;
  const { shape: outputShape } = model.output as SymbolicTensor;

  const xSize = inputShape[1];
  assertIsDefined(xSize);

  const ySize = outputShape[1];
  assertIsDefined(ySize);

  const quantized = quantize(prices, timeUnit);
  const stats = keepStats(quantized);
  const interpolated = interpolate(quantized, stats, timeUnit);
  const normalized = normalize(interpolated, stats);
  const labels = getLabels(interpolated, timeUnit, benefitDuration);
  assert(normalized.length === labels.length);

  const zippedFilter = (
    values: [QuantizedPrice | undefined, Partial<Labels> | undefined],
  ): values is [QuantizedPrice, Labels] => {
    const [x, y] = values;

    if (!isDefined(x)) return false;
    if (!isDefined(y)) return false;
    return labelKeys.every(key => isDefined(y[key]));
  };

  const zipped = _(normalized)
    .zip(labels)
    .dropWhile(_.negate(zippedFilter))
    .takeWhile(zippedFilter)
    .filter(zippedFilter)
    .value();
  console.log(zipped);

  const [xData, yData] = _(zipped.length - xSize - ySize)
    .range()
    .map(i => [
      zipped
        .slice(i, i + xSize)
        .map(([{ price, lottery }]) => [price, lottery]),
      zipped
        .slice(i + xSize - 1, i + xSize - 1 + ySize)
        .map(([_x, l]) => labelKeys.map(key => l[key])),
    ])
    .unzip()
    .value();
  console.log({ xData, yData });

  const trainX = tensor(xData);
  const trainY = tensor(yData);

  const metrics = ['loss', 'mse', 'acc'].map(m => [m, `val_${m}`]).flat();
  await model.fit(trainX, trainY, {
    ...options,
    callbacks: view?.fitCallbacks(metrics),
  });

  model.setUserDefinedMetadata({
    stats,
    inputSize: xSize,
    outputSize: ySize,
    timeUnit: timeUnit.toISO(),
  });

  if (view) {
    const predicted = (
      await Promise.all(
        _.range(0, normalized.length, ySize)
          .map(i => normalized.slice(i, i + xSize))
          .filter(c => c.length === xSize)
          .map(x => predictNormalized(model, x)),
      )
    ).flat();

    labelKeys.forEach(key => {
      view.lineChart(
        {
          predicted: predicted.map(p => p[key]).map(Number),
          teacher: labels
            .slice(xSize)
            .map(l => l[key])
            .map(Number),
        },
        `predicted: ${key}`,
      );
    });
  }

  return model;
}
