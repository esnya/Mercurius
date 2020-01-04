import React from 'react';
import _ from 'lodash';
import { createClassFromSpec } from 'react-vega';
import { PredictionResult } from '../ai';
import { lite, timeFormat } from '../definitions/chart';

export interface PredictedChartProps {
  predicted: PredictionResult[];
}

const VegaChart = createClassFromSpec({
  mode: 'vega-lite',
  spec: {
    ...lite,
    title: '騰落確率',
    data: { name: 'predicted' },
    mark: 'line',
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
    },
  },
});

export default function PredictedChart({
  predicted,
}: PredictedChartProps): JSX.Element {
  const data = {
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

  return <VegaChart data={data} />;
}
