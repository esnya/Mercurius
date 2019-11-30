import React, { useState } from 'react';
import { withESQuery, ChildProps } from '../enhancers/withESQuery';
import {
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Container,
  Label,
  LabelProps,
  Icon,
  Modal,
  Button,
  Segment,
} from 'semantic-ui-react';
import { VegaLite } from 'react-vega';
import get from 'lodash/get';
import sortBy from 'lodash/sortBy';
import { formatInteger, formatDecimal } from '../utilities/format';
import moment from 'moment';
import defaultsDeep from 'lodash/defaultsDeep';
import { TopLevelSpec } from 'vega-lite';

interface Item {
  name: string;
  lastPrice: number;
  maxPrice: number;
  minPrice: number;
  lastRate: number;
  totalRate: number;
  diff: number | null;
  diffRate: number | null;
  values: { timestamp: number; value: number }[];
}

const Colors: LabelProps['color'][] = [
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

function diffIcon(diffRate: number | null): JSX.Element {
  if (diffRate === null) return <Icon color="grey" name="question" />;
  if (Math.abs(diffRate) > 0.7) return <Icon color="red" name="warning" />;
  if (diffRate < -0.1) return <Icon color="red" name="angle double down" />;
  if (diffRate < -0.01) return <Icon color="orange" name="angle down" />;
  if (diffRate > 0.1) return <Icon color="blue" name="angle double up" />;
  if (diffRate > 0.01) return <Icon color="teal" name="angle up" />;
  return <Icon color="green" name="minus" />;
}

const ChartSpec: TopLevelSpec = {
  // width: 400,
  // height: 300,
  $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
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

const ChartModal = React.memo(function ChartModal({
  item,
  open,
  onClose,
}: {
  item: Item;
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  const color = Colors[Math.floor((Colors.length - 1) * item.lastRate)];
  const domain = [
    moment()
      .subtract(14, 'days')
      .add(9, 'hours')
      .toISOString(),
    moment()
      .add(9, 'hours')
      .toISOString(),
  ];
  const spec: TopLevelSpec = defaultsDeep(
    {
      title: item.name,
      height: Math.max(window.innerHeight - 200, 200),
      width: Math.min(Math.max(window.innerWidth - 200, 200), 790),
      encoding: {
        color: {
          value: color,
        },
        x: {
          scale: {
            domain,
          },
        },
      },
    },
    ChartSpec,
  );
  return (
    <Modal open={open} onClose={onClose}>
      <Segment>
        <VegaLite spec={spec} data={{ data: item.values }} />
        <Button onClick={onClose}>閉じる</Button>
      </Segment>
    </Modal>
  );
});

const Row = React.memo(function Row({ item }: { item: Item }): JSX.Element {
  const color = Colors[Math.floor((Colors.length - 1) * item.lastRate)];
  const [open, setOpen] = useState(false);

  return (
    <TableRow>
      <TableCell textAlign="center">
        <Button basic icon size="small" onClick={(): void => setOpen(true)}>
          {item.diffRate && diffIcon(item.diffRate)}
        </Button>
      </TableCell>
      <TableCell>{item.name}</TableCell>
      <TableCell textAlign="right">{formatInteger(item.lastPrice)}</TableCell>
      <TableCell textAlign="right">
        {item.diffRate && formatDecimal(item.diffRate * 100)}%
      </TableCell>
      <TableCell textAlign="right">
        <Label color={color}>{formatDecimal(item.lastRate * 100)}%</Label>
      </TableCell>
      <TableCell textAlign="right">{formatInteger(item.minPrice)}</TableCell>
      <TableCell textAlign="right">{formatInteger(item.maxPrice)}</TableCell>
      <TableCell textAlign="right">
        {formatDecimal(item.totalRate * 100)}%
      </TableCell>
      <ChartModal
        item={item}
        open={open}
        onClose={(): void => setOpen(false)}
      />
    </TableRow>
  );
});

interface State {
  sort: {
    column: keyof Item;
    direction: 'ascending' | 'descending';
  };
}

function sortPredicate(column: string) {
  return (item: Item): string | number => get(item, column);
}

export default withESQuery(
  'mercurius-trading',
  {
    size: 0,
    aggs: {
      name_buckets: {
        terms: {
          field: 'name.keyword',
          size: 10000,
        },
        aggs: {
          stats: {
            extended_stats: {
              field: 'value',
            },
          },
          date_buckets: {
            date_histogram: {
              field: 'timestamp',
              calendar_interval: 'hour',
            },
            aggs: {
              stats: {
                extended_stats: {
                  field: 'value',
                },
              },
            },
          },
        },
      },
    },
  },
  5 * 1000,
)(
  class Analytics extends React.Component<ChildProps, State> {
    constructor(props: ChildProps) {
      super(props);

      this.state = {
        sort: {
          column: 'totalRate',
          direction: 'descending',
        },
      };
    }

    get items(): Item[] {
      const items = this.props.value.aggregations.name_buckets.buckets.map(
        bucket => {
          const dateBuckets = sortBy(bucket.date_buckets.buckets, b => -b.key);
          const lastBucket = dateBuckets[0];

          const totalStats = bucket.stats;
          const lastStats = lastBucket ? lastBucket.stats : totalStats;

          const name = bucket.key;

          const lastPrice = lastStats.avg;
          const maxPrice = bucket.stats.max;
          const minPrice = bucket.stats.min;

          const hourAsMillis = moment.duration(1, 'hour').asMilliseconds();
          const dayAsMillis = moment.duration(1, 'day').asMilliseconds();
          const prevBucket = dateBuckets.find(
            b =>
              b.stats.avg !== null &&
              (lastBucket.key as any) - (b.key as any) > hourAsMillis * 6 &&
              b.stats.avg !== lastPrice,
          );
          const prevPrice = prevBucket && prevBucket.stats.avg;
          const diffRange =
            prevBucket &&
            ((lastBucket.key as any) - (prevBucket.key as any)) / dayAsMillis;

          const diff =
            prevPrice && diffRange ? (lastPrice - prevPrice) / diffRange : null;
          const diffRate = prevPrice && diff ? diff / prevPrice : null;

          const totalDiff = maxPrice - minPrice;
          const totalRate =
            totalDiff === 0 ? 0 : (maxPrice - minPrice) / minPrice;
          const lastRate =
            totalDiff === 0 ? 0 : (lastPrice - minPrice) / totalDiff;

          const values = dateBuckets
            .filter(b => b.stats.avg)
            .map(b => ({
              timestamp: (b.key as unknown) as number,
              value: b.stats.avg,
            }));

          return {
            name,
            lastPrice,
            maxPrice,
            minPrice,
            totalRate,
            lastRate,
            diff,
            diffRate,
            values,
          };
        },
      );

      const { column, direction } = this.state.sort;
      const sorted = sortBy(items, sortPredicate(column));
      return direction === 'descending' ? sorted.reverse() : sorted;
    }

    render(): JSX.Element {
      const rows = this.items.map(item => <Row key={item.name} item={item} />);

      const headerCell = (
        column: keyof Item,
        label: string | JSX.Element,
        textAlign?: 'center',
      ): JSX.Element => {
        const sorted =
          this.state.sort.column === column
            ? this.state.sort.direction
            : undefined;
        const onClick = (): void => {
          this.setState(({ sort }) => ({
            sort: {
              column,
              direction:
                sort.column === column && sort.direction === 'descending'
                  ? 'ascending'
                  : 'descending',
            },
          }));
        };
        return (
          <TableHeaderCell
            sorted={sorted}
            textAlign={textAlign}
            onClick={onClick}
          >
            {label}
          </TableHeaderCell>
        );
      };

      return (
        <Container>
          <Table sortable>
            <TableHeader>
              <TableRow>
                {headerCell('diffRate', <Icon name="line graph" />, 'center')}
                {headerCell('name', 'アイテム名')}
                {headerCell('lastPrice', '現価')}
                {headerCell('diffRate', '増減率')}
                {headerCell('lastRate', '')}
                {headerCell('minPrice', '底値')}
                {headerCell('maxPrice', '高値')}
                {headerCell('totalRate', '変動幅')}
              </TableRow>
            </TableHeader>
            <TableBody>{rows}</TableBody>
          </Table>
        </Container>
      );
    }
  },
);
