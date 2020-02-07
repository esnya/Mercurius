import { View, parse, changeset } from 'vega';
import { TopLevelSpec, compile } from 'vega-lite';
import defaultsDeep from 'lodash/defaultsDeep';
import { Canvas } from 'canvas';
import firebase from 'firebase-admin';
import _ from 'lodash';
import { DateTime, Duration } from 'luxon';
import { DocumentSnapshot } from 'mercurius-core/lib/firestore/types';
import Item from 'mercurius-core/lib/models-next/Item';
import Price from 'mercurius-core/lib/models-next/Price';

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

export const defaultSpec: TopLevelSpec = {
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
          value: 12,
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
      // shortTimeLabels: true,
    },
  },
};

export const backgroundChartSpec = defaultsDeep(
  {
    padding: 0,
    layer: [{ mark: 'area' }, { mark: 'line' }],
    title: null,
    encoding: {
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

export const chartSpec = defaultSpec;

export interface RenderChartOptions {
  spec: TopLevelSpec;
  itemSnapshot: DocumentSnapshot<Item>;
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
}: RenderChartOptions): Promise<string> {
  const itemRef = itemSnapshot.ref;
  console.debug('rendering', type, itemRef.path);

  const domainLeft = DateTime.local()
    .minus(Duration.fromISO('P30D'))
    .valueOf();

  const data = prices
    .map(({ timestamp, ...others }) => ({
      ...others,
      timestamp: timestamp,
    }))
    .filter(({ timestamp }) => timestamp > domainLeft);

  const closing = _.maxBy(data, ({ timestamp }) => timestamp);
  const min = _.min(data.map(({ price }) => price));
  const minClosingRate = closing && min && (closing.price - min) / min;

  const mergedSpec: TopLevelSpec = defaultsDeep({}, spec, {
    title: itemSnapshot.data()?.name,
    encoding: {
      color: {
        value: minClosingRate ? getColorCode(minClosingRate) : 'grey',
      },
    },
  });

  const view = new View(parse(compile(mergedSpec).spec), { renderer: 'none' });
  view.change(
    'data',
    changeset()
      .remove(() => true)
      .insert(data),
  );
  await view.runAsync();

  const canvas = ((await view.toCanvas()) as unknown) as Canvas;
  const src = canvas.createPNGStream();

  const bucket = storage.bucket();
  const path = `${itemRef.path}/${type}`;

  const file = bucket.file(path);
  const dst = file.createWriteStream({
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

  const { 0: url } = await file.getSignedUrl({
    action: 'read',
    expires: DateTime.local().plus(Duration.fromISO('P7D')).toJSDate(),
  });
  return url;
}

export default async function renderAllCharts({
  prices,
  ...options
}: {
  storage: firebase.storage.Storage;
  itemSnapshot: DocumentSnapshot<Item>;
  prices: Price[];
}): Promise<Record<string, string>> {
  const [backgroundChartUrl, chartUrl] = await Promise.all([
    renderChart({
      ...options,
      prices,
      spec: backgroundChartSpec,
      type: 'backgroundChart',
    }),
    renderChart({
      ...options,
      prices,
      spec: chartSpec,
      type: 'chart',
    }),
  ]);

  return {
    chartUrl,
    backgroundChartUrl,
  };
}
