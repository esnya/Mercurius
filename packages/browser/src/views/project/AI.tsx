import React, { useState } from 'react';
import _ from 'lodash';
import { Container, Loader, Dimmer, Message, Segment } from 'semantic-ui-react';
import { useQuerySnapshot } from '../../hooks/useSnapshot';
import { useParams } from 'react-router-dom';
import NotFound from '../NotFound';
import { Price, PriceConverter } from 'mercurius-core/lib/models/Price';
import { isFailed, isSucceeded, isDefined } from '../../utilities/types';
import { Duration, DateTime } from 'luxon';
import * as tf from '@tensorflow/tfjs';
import * as tfvis from '@tensorflow/tfjs-vis';
import useAsyncSimple from '../../hooks/useAsyncSimple';
import { VegaLite } from 'react-vega';

import { TopLevelSpec } from 'vega-lite';
import useAsyncEffect from '../../hooks/useAsyncEffect';
import ActionButton from '../../components/ActionButton';

interface Stats {
  timestamp: [number, number];
  price: [number, number];
}
function calculateStats(prices: Price[]): Stats {
  return {
    timestamp: [
      prices.map(p => p.timestamp.getTime()).reduce((a, b) => Math.min(a, b)),
      prices.map(p => p.timestamp.getTime()).reduce((a, b) => Math.max(a, b)),
    ],
    price: [
      prices.map(p => p.price).reduce((a, b) => Math.min(a, b)),
      prices.map(p => p.price).reduce((a, b) => Math.max(a, b)),
    ],
  };
}

const timeStep = Duration.fromISO('PT1H').valueOf();

interface NormalizedPrice {
  timestamp: number;
  price: number;
  lottery: number;
}
function normalize(
  { price, timestamp, lottery }: Price,
  stats: Stats,
): NormalizedPrice {
  return {
    timestamp: Math.floor(timestamp.getTime() / timeStep),
    price: (price - stats.price[0]) / (stats.price[1] - stats.price[0]),
    lottery: lottery ? 1 : 0,
  };
}

function group(prices: NormalizedPrice[]): Record<string, NormalizedPrice> {
  return _(prices)
    .groupBy(p => p.timestamp)
    .mapValues(p => _(p))
    .mapValues(p => ({
      timestamp: p.map(p => p.timestamp).mean(),
      price: p.map(p => p.price).mean(),
      lottery: p.map(p => p.lottery).mean(),
    }))
    .value();
}

function linearInterpolate(
  timestamp: number,
  grouped: Record<string, NormalizedPrice>,
  stats: Stats,
): NormalizedPrice | null {
  const found = grouped[`${timestamp}`];
  if (found) {
    return found;
  }

  const min = Math.floor(stats.timestamp[0] / timeStep);
  const max = Math.floor(stats.timestamp[1] / timeStep);

  let left = timestamp;
  while (left >= min && !(`${left}` in grouped)) left--;
  let right = timestamp;
  while (right <= max && !(`${right}` in grouped)) right++;

  if (left < min || right > max) return null;

  const leftValue = grouped[left];
  const rightValue = grouped[right];

  const duration = rightValue.timestamp - leftValue.timestamp;
  const rightRate = (timestamp - leftValue.timestamp) / duration;
  const leftRate = 1 - rightRate;

  return {
    timestamp,
    price: leftValue.price * leftRate + rightValue.price * rightRate,
    lottery: leftValue.lottery * leftRate + rightValue.lottery * rightRate,
  };
}

interface Metadata {
  stats: Stats;
  inputSize: number;
  outputSize: number;
}

function encode(prices: Price[], stats: Stats): NormalizedPrice[] {
  const normalized = prices.map(p => normalize(p, stats));
  const grouped = group(normalized);
  const interpolated = _(stats.timestamp[0])
    .range(stats.timestamp[1], timeStep)
    .map(t => linearInterpolate(Math.floor(t / timeStep), grouped, stats))
    .dropWhile(_.isNull)
    .takeWhile(_.isObject)
    .filter(isDefined)
    .value();

  return interpolated;
}

async function predict(
  model: tf.LayersModel,
  prices: Price[],
): Promise<Price[]> {
  const { stats, inputSize } = model.getUserDefinedMetadata() as Metadata;

  const encoded = encode(prices, stats).slice(-inputSize);
  const last = _.last(encoded);

  if (encoded.length !== inputSize || !last) {
    throw new TypeError(
      `Size of input must be ${inputSize}, not ${encode.length}`,
    );
  }

  const x = tf.tensor([encoded.map(p => [p.price, p.lottery])]);
  const y = (await model.predict(x)) as tf.Tensor;

  const data = await y.data();

  return _(data)
    .map((price, i) => ({
      timestamp: new Date((last.timestamp + i) * timeStep),
      price: price * (stats.price[1] - stats.price[0]) + stats.price[0],
      lottery: false,
    }))
    .value();
}

async function fitModel(prices: Price[]): Promise<tf.LayersModel> {
  const stats = calculateStats(prices);
  const interpolated = encode(prices, stats);

  tfvis.render.linechart(
    { name: 'interpolated' },
    {
      values: [
        interpolated.map(p => ({ x: p.timestamp, y: p.price })),
        interpolated.map(p => ({ x: p.timestamp, y: p.lottery })),
      ],
      series: ['price', 'lottery'],
    },
  );

  const model = tf.sequential();
  model.add(
    tf.layers.dense({
      inputShape: [24 * 4, 2],
      units: 24 * 4,
      activation: 'relu',
    }),
  );
  model.add(tf.layers.flatten({}));
  model.add(tf.layers.dense({ units: 24 * 4 * 2, activation: 'relu' }));
  // model.add(tf.layers.dense({ units: 24 * 4, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 24 * 4 }));
  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
  tfvis.show.modelSummary({ name: 'model' }, model);

  const { shape: inputShape } = model.input as tf.SymbolicTensor;
  const { shape: outputShape } = model.output as tf.SymbolicTensor;

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

  const trainX = tf.tensor(xData);
  const trainY = tf.tensor(yData);

  await model.fit(trainX, trainY, {
    epochs: 20,
    validationSplit: 0.5,
    callbacks: tfvis.show.fitCallbacks({ name: 'fit' }, [
      'loss',
      'mse',
      'val_loss',
    ]),
  });

  model.setUserDefinedMetadata({ stats, inputSize: xSize, outputSize: ySize });

  const testXList = _(0)
    .range(interpolated.length, ySize)
    .map(i => interpolated.slice(i, i + xSize).map(p => [p.price, p.lottery]))
    .filter(x => x.length === xSize)
    .value();

  tfvis.render.linechart(
    { name: 'predicted' },
    {
      values: interpolated.map(p => ({ x: p.timestamp, y: p.price })),
      series: ['price'],
    },
  );

  const predicted = await Promise.all(
    testXList.map(
      async (x): Promise<number[]> => {
        const tensor = (await model.predict(tf.tensor([x]))) as tf.Tensor;
        const data = await tensor.data();
        return Array.from(data);
      },
    ),
  );

  tfvis.render.linechart(
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

async function loadModel(url: string): Promise<tf.LayersModel> {
  const model = await tf.loadLayersModel(url);
  const meta = model.getUserDefinedMetadata();

  if (typeof meta !== 'object') {
    throw new TypeError();
  }

  return model;
}

export default function AI(): JSX.Element {
  const { projectId, itemId } = useParams();

  const priceSnapshots = useQuerySnapshot(
    firestore =>
      firestore.collection(`projects/${projectId}/items/${itemId}/prices`),
    PriceConverter.cast,
  );

  const modelUrl = `indexeddb://mercurius-${projectId}-${itemId}-prices`;
  const loadedModel = useAsyncSimple(_.partial(loadModel, modelUrl), [
    modelUrl,
  ]);

  const [model, setModel] = useState<tf.LayersModel>();

  useAsyncEffect(async (): Promise<void> => {
    if (isSucceeded(loadedModel)) {
      return setModel(loadedModel);
    }
    if (!isFailed(loadedModel)) {
      return;
    }
    if (!isSucceeded(priceSnapshots) || priceSnapshots.length === 0) {
      return;
    }
    const model = await fitModel(priceSnapshots.map(s => s.data));
    await model.save(modelUrl);
    setModel(model);
  }, [loadedModel, modelUrl, priceSnapshots]);

  const predicted = useAsyncSimple(async (): Promise<Price[] | null> => {
    if (!isSucceeded(model) || !model) return null;
    if (!isSucceeded(priceSnapshots) || priceSnapshots.length === 0)
      return null;

    return await predict(
      model,
      priceSnapshots.map(s => s.data),
    );
  }, [model, priceSnapshots]);

  if (!projectId || !itemId) {
    return <NotFound />;
  }

  if (isFailed(priceSnapshots)) {
    return <Message negative>{priceSnapshots.toString()}</Message>;
  }
  if (isFailed(predicted)) {
    return <Message negative>{predicted.toString()}</Message>;
  }

  if (!isSucceeded(priceSnapshots) || !isSucceeded(predicted)) {
    return (
      <Dimmer active>
        <Loader />
      </Dimmer>
    );
  }

  const dur = Duration.fromISO('P14D');
  const spec: TopLevelSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
    width: 500,
    title: itemId,
    data: {
      values: priceSnapshots
        .map(s => ({ ...s.data, series: '市場価格' }))
        .filter(
          p => DateTime.fromJSDate(p.timestamp) > DateTime.local().minus(dur),
        )
        .concat(predicted.map(p => ({ ...p, series: '予測' }))),
    },
    layer: [
      {
        mark: 'line',
      },
      {
        mark: 'point',
        encoding: {
          color: {
            value: 'red',
            condition: {
              test: '!datum.lottery',
              value: null,
            },
          },
        },
      },
    ],
    encoding: {
      x: {
        field: 'timestamp',
        type: 'temporal',
      },
      y: {
        field: 'price',
        type: 'quantitative',
      },
      color: {
        field: 'series',
        type: 'nominal',
      },
    },
  };

  const updateModel = async (): Promise<void> => {
    const model = await fitModel(priceSnapshots.map(s => s.data));
    await model.save(modelUrl);
    setModel(model);
  };

  return (
    <Container>
      <Segment>
        <VegaLite spec={spec} />
        <ActionButton action={updateModel} color="blue">
          再学習
        </ActionButton>
      </Segment>
    </Container>
  );
}
