import defaultsDeep from 'lodash/defaultsDeep';
import { View, parse, changeset } from 'vega';
import { TopLevelSpec, compile } from 'vega-lite';

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
    y: { field: 'value', type: 'quantitative' },
    strokeWidth: { value: 1 },
    tooltip: {
      format: ',',
      formatType: 'number',
      field: 'value',
      type: 'quantitative',
    },
  },
  config: {
    axis: {
      shortTimeLabels: true,
    },
  },
};

export default async function renderChart<T>(
  spec: {},
  data: T[],
): Promise<string> {
  const view = new View(parse(compile(defaultsDeep(spec, DefaultSpec)).spec));
  view.change(
    'data',
    changeset()
      .remove(() => true)
      .insert(data),
  );
  await view.runAsync();
  return await view.toImageURL('png');
}
