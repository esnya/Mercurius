import React from 'react';
import { Price } from 'mercurius-core/lib/models/Price';
import { DateTime, Duration } from 'luxon';
import { createClassFromSpec } from 'react-vega';
import { lite, timeFormat } from '../definitions/chart';

export interface PredictedChartProps {
  name: string;
  prices: Price[];
}

const DomainDuration = Duration.fromISO('P60D');

const VegaChart = createClassFromSpec({
  mode: 'vega-lite',
  spec: {
    ...lite,
    data: { name: 'prices' },
    transform: [
      {
        calculate: '"Min " + datum.name',
        as: 'minLabel',
      },
      {
        calculate: '"Max " + datum.name',
        as: 'maxLabel',
      },
      {
        calculate: '"Avg " + datum.name',
        as: 'avgLabel',
      },
      {
        calculate: '"StdDev " + datum.name',
        as: 'sdLabel',
      },
    ],
    layer: [
      {
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
                title: '凡例',
                field: 'minLabel',
                type: 'nominal',
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
                title: '凡例',
                field: 'maxLabel',
                type: 'nominal',
              },
            },
          },
          {
            mark: 'rule',
            encoding: {
              y: {
                field: 'price',
                type: 'quantitative',
                aggregate: 'average',
              },
              color: {
                title: '凡例',
                field: 'avgLabel',
                type: 'nominal',
              },
            },
          },
          {
            mark: 'rule',
            encoding: {
              y: {
                field: 'price',
                type: 'quantitative',
                aggregate: 'stdev',
              },
              color: {
                title: '凡例',
                field: 'sdLabel',
                type: 'nominal',
              },
            },
          },
        ],
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
            title: '日時',
            axis: timeFormat,
            field: 'timestamp',
            type: 'temporal',
          },
          y: {
            title: '価格',
            field: 'price',
            type: 'quantitative',
          },
          color: {
            title: '凡例',
            field: 'name',
            type: 'nominal',
          },
        },
      },
    ],
  },
});

export default function PriceChart({
  name,
  prices,
}: PredictedChartProps): JSX.Element {
  const domain = [DateTime.local().minus(DomainDuration), DateTime.local()];
  const data = {
    prices: prices
      .map(p => ({ ...p, name }))
      .filter((p): boolean => {
        const datetime = DateTime.fromJSDate(p.timestamp);
        return domain[0] <= datetime && datetime <= domain[1];
      }),
  };

  return <VegaChart data={data} />;
}
