import _ from 'lodash';
import { render, show, Point2D } from '@tensorflow/tfjs-vis';
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
import { assertIsDefined } from '../utilities/assert';

function difference(values: number[]): number[] {
  return _.zip(values.slice(0, -1), values.slice(1)).map(([prev, curr]) => {
    assertIsDefined(prev);
    assertIsDefined(curr);
    return prev === 0 ? 0 : (curr - prev) / prev;
  });
}

function toPoint2D(y: number): Point2D {
  return { x: 0, y };
}

export async function fit(
  model: LayersModel,
  prices: Price[],
  options?: ModelFitArgs,
): Promise<LayersModel> {
  show.modelSummary({ name: 'model' }, model);

  const stats = calculateStats(prices);
  const interpolated = encode(prices, stats);
  const priceDiff = difference(
    interpolated.map(
      p => p.price * (stats.price.max - stats.price.min) + stats.price.min,
    ),
  );

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
  render.linechart(
    { name: 'roid' },
    {
      values: priceDiff.map(toPoint2D),
      series: ['r'],
    },
  );

  const { shape: inputShape } = model.input as SymbolicTensor;
  const { shape: outputShape } = model.output as SymbolicTensor;

  const xSize = inputShape[1];
  const ySize = outputShape[1];

  if (!isDefined(xSize) || !isDefined(ySize)) {
    throw new TypeError();
  }

  const th = 0.01;

  const [xData, yData] = _(_)
    .range(interpolated.length - xSize - ySize)
    .map(i => {
      const x = interpolated.slice(i, i + xSize).map(p => [p.price, p.lottery]);
      const lastPrice = interpolated[i + xSize - 1].price;

      const y = interpolated.slice(i + xSize, i + xSize + ySize).map(p => {
        const r = (p.price - lastPrice) / lastPrice;

        return [r >= th, Math.abs(r) < th, r <= -th].map(b => (b ? 1 : 0));
      });

      return [x, y];
    })
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
      series: ['rate'],
    },
  );

  const predicted = (
    await Promise.all(
      testXList.map(
        async (x): Promise<number[][]> => {
          const y = (await model.predict(tensor([x]))) as Tensor;
          const data = await y.data();
          return _.chunk(data, 3);
        },
      ),
    )
  ).flat();

  const dummyPoint = { x: 0, y: 0 };
  const dummyPoints = (length: number): Point2D[] =>
    _.range(length).map(() => dummyPoint);

  render.linechart(
    { name: 'test' },
    {
      values: [
        _.range(predicted.length + xSize).map(_.constant(toPoint2D(-th))),
        _.range(predicted.length + xSize).map(_.constant(toPoint2D(th))),
        [
          ...priceDiff.map(toPoint2D),
          ...dummyPoints(ySize + xSize - priceDiff.length),
        ],
      ],
      series: ['-10%', '10%', 'rate'],
    },
  );
  render.linechart(
    { name: 'predicted' },
    {
      values: _(predicted)
        .map(a => a.map(b => ({ x: 0, y: b })))
        .unzip()
        .map(a => [...dummyPoints(xSize), ...a])
        .value(),
      series: ['r >= 10%', 'r ~= 0%', 'r <= -10%'],
    },
  );

  return model;
}
