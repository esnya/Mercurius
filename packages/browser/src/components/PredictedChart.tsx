import React from 'react';
import _ from 'lodash';
import { createClassFromSpec } from 'react-vega';
import { PredictionResult } from '../prediction';
import { lite, timeFormat } from '../definitions/chart';

export interface PredictedChartProps {
  predicted: PredictionResult[];
}

const VegaChart = createClassFromSpec({
  mode: 'vega-lite',
  spec: {
    ...lite,
    selection: {
      pts: { type: 'multi', fields: ['series'] },
    },
    data: { name: 'predicted' },
    mark: {
      type: 'line',
      point: true,
    },
    encoding: {
      x: {
        field: 'timestamp',
        type: 'temporal',
        axis: {
          ...timeFormat,
          labelAngle: 90,
        },
      },
      y: {
        field: 'rate',
        type: 'quantitative',
        scale: {
          domain: [0, 1],
        },
      },
      color: {
        field: 'series',
        type: 'nominal',
      },
      opacity: {
        condition: {
          selection: 'pts',
          value: 1,
        },
        value: 0.25,
      },
    },
  },
});

export default function PredictedChart({
  predicted,
}: PredictedChartProps): JSX.Element {
  const roidData = {
    predicted: _(predicted)
      .map(({ timestamp, increase, flat, decrease }) => [
        { timestamp, rate: increase, series: '上昇確率' },
        { timestamp, rate: flat, series: '横ばい確率' },
        { timestamp, rate: decrease, series: '下降確率' },
      ])
      .unzip()
      .flatten()
      .value(),
  };
  const indexData = {
    predicted: _(predicted)
      .map(({ timestamp, buy, sell }) => [
        { timestamp, rate: buy, series: '買い指標' },
        { timestamp, rate: sell, series: '売り指標' },
      ])
      .unzip()
      .flatten()
      .value(),
  };

  return (
    <div>
      <VegaChart data={roidData} />
      <VegaChart data={indexData} />
    </div>
  );
}
