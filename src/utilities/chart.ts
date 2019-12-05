import defaultsDeep from 'lodash/defaultsDeep';
import { View, parse, changeset } from 'vega';
import { TopLevelSpec, compile } from 'vega-lite';
import { SemanticCOLORS } from 'semantic-ui-react/dist/commonjs/generic';

const Colors: SemanticCOLORS[] = [
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

export function getColorName(rate: number): SemanticCOLORS {
  return Colors[
    Math.floor((Colors.length - 1) * Math.max(Math.min(rate, 1), 0))
  ];
}

export function getColorCode(value: number): SemanticCOLORS | string {
  const color = getColorName(value);
  if (color === 'yellow') return '#FFD700';
  return color;
}

const DefaultSpec: TopLevelSpec = {
  width: 1024,
  height: 1024,
  $schema: 'https://vega.github.io/schema/vega-lite/v4.0.0-beta.12.json',
  padding: 30,
  data: { name: 'data' },
  layer: [{ mark: 'line' }, { mark: 'point' }],
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
  },
  config: {
    axis: {
      shortTimeLabels: true,
    },
  },
};

export async function renderView<T>(spec: {}, data: T[]): Promise<View> {
  const view = new View(parse(compile(defaultsDeep(spec, DefaultSpec)).spec));
  view.change(
    'data',
    changeset()
      .remove(() => true)
      .insert(data),
  );
  await view.runAsync();
  return view;
}

export default async function renderChart<T>(
  spec: {},
  data: T[],
): Promise<string> {
  const view = await renderView(spec, data);
  return await view.toImageURL('png');
}
