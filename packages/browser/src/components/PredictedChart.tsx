import React from 'react';
import { Price } from 'mercurius-core/lib/models/Price';
import { DateTime, Duration } from 'luxon';
import { createClassFromSpec } from 'react-vega';

export interface PredictedChartProps {
  title: string;
  prices: Price[];
  predicted?: Price[];
}

const DomainDuration = Duration.fromISO('P14D');

const VegaChart = createClassFromSpec({
  mode: 'vega-lite',
  spec: {
    $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
    width: 500,
    padding: 50,
    data: { name: 'prices' },
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
  },
});

export default function PredictedChart({
  prices,
  predicted,
}: PredictedChartProps): JSX.Element {
  const domain = [DateTime.local().minus(DomainDuration), DateTime.local()];
  const data = {
    prices: prices
      .map(p => ({ ...p, series: '市場価格' }))
      .filter((p): boolean => {
        const datetime = DateTime.fromJSDate(p.timestamp);
        return domain[0] <= datetime && datetime <= domain[1];
      })
      .concat(predicted ? predicted.map(p => ({ ...p, series: '予測' })) : []),
  };

  return <VegaChart data={data} />;
}
