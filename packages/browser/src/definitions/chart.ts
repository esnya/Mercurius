import { Axis } from 'vega-lite/build/src/axis';
import {
  PositionFieldDef,
  Field,
  FieldDef,
} from 'vega-lite/build/src/channeldef';
import { UnitSpec } from 'vega-lite/build/src/spec';

export const lite = {
  $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
  width: 'container' as 'container',
  padding: 50,
};

export const timeFormat: Axis = {
  formatType: 'time',
  format: '%m/%d %H:%M',
};

export const timestamp: PositionFieldDef<Field> = {
  field: 'timestamp',
  type: 'temporal',
  axis: timeFormat,
};

export const price: PositionFieldDef<Field> = {
  field: 'price',
  type: 'quantitative',
};

export const isLottery = {
  value: 'red',
  condition: {
    test: '!datum.lottery',
    value: null,
  },
};

export function priceAggregateLayer(
  timeUnit: FieldDef<Field>['timeUnit'],
  aggregate: FieldDef<Field>['aggregate'],
): UnitSpec {
  return {
    mark: 'line',
    encoding: {
      x: {
        ...timestamp,
        timeUnit,
      },
      y: {
        ...price,
        aggregate,
      },
    },
  };
}

export const priceMinLayer = priceAggregateLayer('month', 'min');
export const priceMaxLayer = priceAggregateLayer('month', 'max');
