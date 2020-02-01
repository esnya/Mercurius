import { View, parse, changeset } from 'vega';
import { TopLevelSpec, compile } from 'vega-lite';
import defaultsDeep from 'lodash/defaultsDeep';
import { Canvas } from 'canvas';
import firebase from 'firebase-admin';
import { Price } from './types';
import { DateTime, Duration } from 'luxon';

const Colors: string[] = [
  'red',
  'orange',
  'yellow',
  'olive',
  'green',
  'teal',
  'blue',
  'violet',
  'purple',
];

export function getColorName(rate: number): string {
  return Colors[
    Math.floor((Colors.length - 1) * Math.max(Math.min(rate, 1), 0))
  ];
}

export function getColorCode(value: number): string {
  const color = getColorName(value);
  if (color === 'yellow') return '#FFD700';
  return color;
}

export const defaultSpec = {
  width: 1024,
  height: 1024,
  $schema: 'https://vega.github.io/schema/vega-lite/v4.0.0-beta.12.json',
  padding: 30,
  data: { name: 'data' },
  layer: [
    { mark: 'line' },
    { mark: 'point' },
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
        size: {
          value: 10,
        },
      },
    },
  ],
  encoding: {
    x: {
      field: 'timestamp',
      type: 'temporal',
      axis: {
        formatType: 'time',
        format: '%m/%d %H:%M',
      },
    },
    y: { field: 'price', type: 'quantitative' },
    strokeWidth: { value: 1 },
    tooltip: {
      format: ',',
      formatType: 'number',
      field: 'price',
      type: 'quantitative',
    },
    size: { value: 1 },
  },
  config: {
    axis: {
      shortTimeLabels: true,
    },
  },
};

export const backgroundChartSpec = defaultsDeep(
  {
    padding: 0,
    layer: [{ mark: 'area' }, { mark: 'line' }],
    title: null,
    encoding: {
      color: {
        // value: getColorCode(priceStats.endByFluctuationRate),
      },
      x: {
        axis: null,
        sort: 'descending',
      },
      y: {
        axis: null,
      },
      strokeOpacity: { value: 0.25 },
      fillOpacity: { value: 0.1 },
    },
    config: {
      view: {
        stroke: 'transparent',
      },
    },
  },
  defaultSpec,
);

export const chartSpec = defaultsDeep(
  {
    encoding: {
      color: {
        // value: getColorCode(priceStats.endByFluctuationRate),
      },
    },
  },
  defaultSpec,
);

export interface RenderChartOptions {
  itemSnapshot: firebase.firestore.DocumentSnapshot;
  spec: TopLevelSpec;
  prices: Price[];
  storage: firebase.storage.Storage;
  type: string;
}

export async function renderChart({
  itemSnapshot,
  spec,
  prices,
  storage,
  type,
}: RenderChartOptions): Promise<void> {
  const itemRef = itemSnapshot.ref;
  console.debug('rendering', type, itemRef.path);
  const mergedSpec: TopLevelSpec = defaultsDeep({}, spec, {
    title: itemSnapshot.get('name'),
  });

  const view = new View(parse(compile(mergedSpec).spec), { renderer: 'none' });
  view.change(
    'data',
    changeset()
      .remove(() => true)
      .insert(
        prices.map(({ timestamp, ...others }) => ({
          ...others,
          timestamp: timestamp.toMillis(),
        })),
      ),
  );
  await view.runAsync();

  const canvas = ((await view.toCanvas()) as unknown) as Canvas;
  const src = canvas.createPNGStream();

  const bucket = storage.bucket();
  const path = `${itemRef.path}/${type}`;

  const dst = bucket.file(path).createWriteStream({
    metadata: {
      contentType: 'image/png',
    },
  });

  await new Promise((resolve, reject) => {
    src
      .pipe(dst)
      .on('error', reject)
      .on('finish', resolve);
  });

  console.debug('done');
}

export default async function renderAllCharts({
  prices,
  ...options
}: {
  storage: firebase.storage.Storage;
  itemSnapshot: firebase.firestore.DocumentSnapshot;
  prices: Price[];
}): Promise<void> {
  const domainLeft = DateTime.local()
    .minus(Duration.fromISO('P30D'))
    .valueOf();
  const filteredPrices = prices.filter(
    p => p.timestamp.toMillis() > domainLeft,
  );

  await Promise.all([
    renderChart({
      ...options,
      prices: filteredPrices,
      spec: backgroundChartSpec,
      type: 'backgroundChart',
    }),
    renderChart({
      ...options,
      prices: filteredPrices,
      spec: chartSpec,
      type: 'chart',
    }),
  ]);
}
