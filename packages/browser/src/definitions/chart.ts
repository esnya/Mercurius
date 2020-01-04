import { Axis } from 'vega-lite/build/src/axis';

export const lite = {
  $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
  width: 'container' as 'container',
  padding: 50,
};

export const timeFormat: Axis = {
  formatType: 'time',
  format: '%m/%d %H:%M',
};
