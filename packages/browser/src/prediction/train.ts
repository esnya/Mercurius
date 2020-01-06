import _ from 'lodash';
import {
  tensor,
  SymbolicTensor,
  ModelFitArgs,
  LayersModel,
} from '@tensorflow/tfjs';
import { encode, calculateStats } from './prep';
import { Price } from 'mercurius-core/lib/models/Price';
import { assertIsDefined, assert } from '../utilities/assert';
import { NormalizedPrice, IncreasingOrDecreasing } from './types';
import View from './view';
import { isDefined } from '../utilities/types';
import { Stats } from 'mercurius-core/lib/models/ModelMetadata';
import { Duration } from 'luxon';

const th = 0.005;
const buyTh = 0.6;
const sellTh = 0.05;

function calculateRoid(prev: number, value: number, stats: Stats): number {
  const r = stats.price.max - stats.price.min;
  const min = stats.price.min;
  return prev === 0 ? 0 : ((value - prev) * r) / (prev * r + min);
}

function isIncreasing(roid: number): boolean {
  return roid >= th;
}
function isDecreasing(roid: number): boolean {
  return roid <= -th;
}
function isFlat(roid: number): boolean {
  return Math.abs(roid) < th;
}

function calculateRates(
  normalized: NormalizedPrice[],
  stats: Stats,
  timeUnit: Duration,
): IncreasingOrDecreasing<boolean>[] {
  return _.zip(
    normalized.slice(0, -1),
    normalized.slice(1),
    normalized.slice(
      1 +
        Math.round(
          Duration.fromObject({ hours: 48 }).valueOf() / timeUnit.valueOf(),
        ),
    ),
  ).map(([prev, curr, future]) => {
    assertIsDefined(prev);
    assertIsDefined(curr);

    const roid = calculateRoid(prev.price, curr.price, stats);
    const futureRoid = isDefined(future)
      ? calculateRoid(curr.price, future.price, stats)
      : undefined;

    return {
      increasing: isIncreasing(roid),
      flat: isFlat(roid),
      decreasing: isDecreasing(roid),
      buy: isDefined(futureRoid) && futureRoid > buyTh,
      sell: isDefined(futureRoid) && isIncreasing(roid) && futureRoid < -sellTh,
    };
  });
}

type YDataItem = [number, number, number, number];
function rateToArray({
  increasing,
  // flat,
  decreasing,
  buy,
  sell,
}: IncreasingOrDecreasing<boolean>): YDataItem {
  return [increasing, decreasing, buy, sell].map(b => (b ? 1 : 0)) as YDataItem;
}

export async function fit(
  model: LayersModel,
  prices: Price[],
  timeUnit: Duration,
  options?: ModelFitArgs,
  renderContainer?: HTMLElement,
): Promise<LayersModel> {
  const view = renderContainer && new View(renderContainer);
  view?.modelSummary(model);

  const stats = calculateStats(prices);
  const normalized = encode(prices, stats, timeUnit);

  view?.encoded(normalized);
  view?.lineChart(
    _([1, 6, 12, 24, 48])
      .map(hours => {
        const value = _.zip(
          normalized.slice(0, -hours),
          normalized.slice(hours),
        ).map(([prev, next]) => {
          assertIsDefined(prev);
          assertIsDefined(next);
          return calculateRoid(prev.price, next.price, stats);
        });

        return [`${hours} * ${timeUnit.toISO()}h`, value];
      })
      .fromPairs()
      .value(),
    'Rate of increase or decrease',
  );

  const rates = calculateRates(normalized, stats, timeUnit);

  view?.rate(rates);
  view?.buyOrSell(rates);

  const { shape: inputShape } = model.input as SymbolicTensor;
  const { shape: outputShape } = model.output as SymbolicTensor;

  const xSize = inputShape[1];
  assertIsDefined(xSize);

  const ySize = outputShape[1];
  assertIsDefined(ySize);

  assert(rates.length + 1 === normalized.length);
  const [xData, yData] = _(normalized.length - xSize - ySize)
    .range()
    .map(i => [
      normalized
        .slice(i, i + xSize)
        .map(({ price, lottery }) => [price, lottery]),
      rates.slice(i + xSize - 1, i + xSize - 1 + ySize).map(rateToArray),
    ])
    .unzip()
    .value();

  const trainX = tensor(xData);
  const trainY = tensor(yData);

  const metrics = ['loss', 'mse', 'acc'].map(m => [m, `val_${m}`]).flat();
  const history = await model.fit(trainX, trainY, {
    ...options,
    callbacks: view?.fitCallbacks(metrics),
  });
  console.log(history);

  model.setUserDefinedMetadata({ stats, inputSize: xSize, outputSize: ySize });

  if (view) {
    const testXList = _(0)
      .range(normalized.length, ySize)
      .map(i => normalized.slice(i, i + xSize).map(p => [p.price, p.lottery]))
      .filter(x => x.length === xSize)
      .value();
    const testYList = await Promise.all(
      testXList.map(async xData => {
        const y = await model.predict(tensor([xData]));
        return _.chunk(await (Array.isArray(y) ? y[0] : y).data(), 4) as [
          number,
          number,
          number,
          number,
        ][];
      }),
    );

    _(testYList)
      .flatten() // number[3][]
      .unzip() // number[][3]
      .zip(
        _(rates)
          .slice(xSize - 1)
          .map(rateToArray)
          .concat(
            _.range(ySize).map(_.constant([NaN, NaN, NaN, NaN] as YDataItem)),
          )
          .unzip()
          .value(),
      ) // [number, number][]
      .zip(['increasing', 'decreasing', 'buy', 'sell']) // [[number, number], string][]
      .forEach(([values, series]) => {
        assertIsDefined(values);
        assertIsDefined(series);

        const [predicted, teacher] = values;
        assertIsDefined(predicted);
        assertIsDefined(teacher);

        view.lineChart({ predicted, teacher }, `Predicted - ${series}`);
      });
  }

  return model;
}
