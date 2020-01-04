import _ from 'lodash';
import { render, show } from '@tensorflow/tfjs-vis';
import {
  tensor,
  SymbolicTensor,
  ModelFitArgs,
  LayersModel,
  Tensor,
} from '@tensorflow/tfjs';
import { isDefined } from '../utilities/types';
import { encode, calculateStats } from './prep';
import { Price } from 'mercurius-core/lib/models/Price';

export async function fit(
  model: LayersModel,
  prices: Price[],
  options?: ModelFitArgs,
): Promise<LayersModel> {
  show.modelSummary({ name: 'model' }, model);

  const stats = calculateStats(prices);
  const interpolated = encode(prices, stats);

  render.linechart(
    { name: 'interpolated' },
    {
      values: [
        interpolated.map(p => ({ x: p.timestamp, y: p.price })),
        interpolated.map(p => ({ x: p.timestamp, y: p.lottery })),
      ],
      series: ['price', 'lottery'],
    },
  );

  const { shape: inputShape } = model.input as SymbolicTensor;
  const { shape: outputShape } = model.output as SymbolicTensor;

  const xSize = inputShape[1];
  const ySize = outputShape[1];

  if (!isDefined(xSize) || !isDefined(ySize)) {
    throw new TypeError();
  }

  const [xData, yData] = _(_)
    .range(interpolated.length - xSize - ySize)
    .map(
      i =>
        [
          interpolated.slice(i, i + xSize).map(p => [p.price, p.lottery]),
          interpolated.slice(i + xSize, i + xSize + ySize).map(p => p.price),
        ] as [number[][], number[]],
    )
    .shuffle()
    .unzip()
    .value();

  const trainX = tensor(xData);
  const trainY = tensor(yData);

  const metrics = ['loss', 'mse', 'val_loss'];
  await model.fit(trainX, trainY, {
    ...options,
    callbacks: show.fitCallbacks({ name: 'fit' }, metrics),
  });

  model.setUserDefinedMetadata({ stats, inputSize: xSize, outputSize: ySize });

  const testXList = _(0)
    .range(interpolated.length, ySize)
    .map(i => interpolated.slice(i, i + xSize).map(p => [p.price, p.lottery]))
    .filter(x => x.length === xSize)
    .value();

  render.linechart(
    { name: 'test' },
    {
      values: interpolated.map(p => ({ x: p.timestamp, y: p.price })),
      series: ['price'],
    },
  );

  const predicted = await Promise.all(
    testXList.map(
      async (x): Promise<number[]> => {
        const y = (await model.predict(tensor([x]))) as Tensor;
        const data = await y.data();
        return Array.from(data);
      },
    ),
  );

  render.linechart(
    { name: 'test' },
    {
      values: [
        [
          ..._.range(xSize).map(x => ({ x, y: 0 })),
          ...predicted.flat().map((y, x) => ({ x: x + xSize, y })),
        ],
        [
          ...interpolated.map((p, x) => ({ x, y: p.price })),
          ..._.range(
            predicted.length * ySize + xSize - interpolated.length,
          ).map(x => ({
            x: x + interpolated.length,
            y: 0,
          })),
        ],
      ],
      series: ['predicted', 'price'],
    },
  );

  return model;
}
