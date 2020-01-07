import React from 'react';
import { Price } from 'mercurius-core/lib/models/Price';
import { DateTime, Duration } from 'luxon';
import { createClassFromSpec } from 'react-vega';
import { lite, timeFormat } from '../definitions/chart';

export interface PredictedChartProps {
  prices: Price[];
}

const DomainDuration = Duration.fromISO('P4W');

const VegaChart = createClassFromSpec({
  mode: 'vega-lite',
  spec: {
    ...lite,
    title: '市場価格',
    data: { name: 'prices' },
    layer: [
      {
        mark: 'rule',
        encoding: {
          y: {
            field: 'price',
            type: 'quantitative',
            aggregate: 'min',
          },
          color: {
            value: 'red',
          },
        },
      },
      {
        mark: 'rule',
        encoding: {
          y: {
            field: 'price',
            type: 'quantitative',
            aggregate: 'max',
          },
          color: {
            value: 'red',
          },
        },
      },
      {
        layer: [
          { mark: 'line' },
          {
            mark: 'point',
            encoding: {
              size: {
                condition: {
                  test: 'datum.lottery',
                  title: '抽選',
                  value: 100,
                },
                value: 10,
              },
            },
          },
        ],
        encoding: {
          x: {
            ...timeFormat,
            field: 'timestamp',
            type: 'temporal',
          },
          y: {
            title: '価格',
            field: 'price',
            type: 'quantitative',
          },
        },
      },
    ],
  },
});

export default function PriceChart({
  prices,
}: PredictedChartProps): JSX.Element {
  const domain = [DateTime.local().minus(DomainDuration), DateTime.local()];
  const data = {
    prices: prices
      .map(p => ({ ...p, series: '市場価格' }))
      .filter((p): boolean => {
        const datetime = DateTime.fromJSDate(p.timestamp);
        return domain[0] <= datetime && datetime <= domain[1];
      }),
  };

  return <VegaChart data={data} />;
}