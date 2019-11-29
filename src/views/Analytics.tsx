import React from 'react';
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
} from 'semantic-ui-react';
import get from 'lodash/get';
import sortBy from 'lodash/sortBy';
import { formatInteger, formatDecimal } from '../utilities/format';
import moment from 'moment';

interface Item {
  name: string;
  lastPrice: number;
  maxPrice: number;
  minPrice: number;
  lastRate: number;
  totalRate: number;
  diff: number | null;
  diffRate: number | null;
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
  if (diffRate < -0.1) return <Icon color="red" name="angle double down" />;
  if (diffRate < -0.01) return <Icon color="orange" name="angle down" />;
  if (diffRate > 0.1) return <Icon color="blue" name="angle double up" />;
  if (diffRate > 0.01) return <Icon color="teal" name="angle up" />;
  return <Icon color="green" name="minus" />;
}

const Row = React.memo(function Row({ item }: { item: Item }): JSX.Element {
  const color = Colors[Math.floor((Colors.length - 1) * item.lastRate)];

  return (
    <TableRow>
      <TableCell>{item.diffRate && diffIcon(item.diffRate)}</TableCell>
      <TableCell>{item.name}</TableCell>
      <TableCell textAlign="right">{formatInteger(item.lastPrice)}</TableCell>
      <TableCell textAlign="right">
        <Label color={color}>{formatDecimal(item.lastRate * 100)}%</Label>
      </TableCell>
      <TableCell textAlign="right">{formatInteger(item.minPrice)}</TableCell>
      <TableCell textAlign="right">{formatInteger(item.maxPrice)}</TableCell>
      <TableCell textAlign="right">
        {formatDecimal(item.totalRate * 100)}%
      </TableCell>
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
  'rom_trading',
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

          return {
            name,
            lastPrice,
            maxPrice,
            minPrice,
            totalRate,
            lastRate,
            diff,
            diffRate,
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
        label?: string | JSX.Element,
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
                sort.column === column && sort.direction === 'ascending'
                  ? 'descending'
                  : 'ascending',
            },
          }));
        };
        return (
          <TableHeaderCell sorted={sorted} onClick={onClick}>
            {label}
          </TableHeaderCell>
        );
      };

      return (
        <Container>
          <Table sortable>
            <TableHeader>
              <TableRow>
                {headerCell('diffRate', <Icon name="line graph" />)}
                {headerCell('name', 'アイテム名')}
                {headerCell('lastPrice', '現価')}
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
