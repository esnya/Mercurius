import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
import DiffIcon from '../components/DiffIcon';

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

const Colors: Exclude<LabelProps['color'], undefined>[] = [
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

function getChartColor(rate: number): string {
  const color = Colors[Math.floor((Colors.length - 1) * rate)];
  if (color === 'yellow') return '#FFD700';
  return color;
}

const ChartSpec: TopLevelSpec = {
  // width: 400,
  // height: 300,
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

function getChartDomain(): [string, string] {
  return [
    moment()
      .subtract(14, 'days')
      .add(9, 'hours')
      .toISOString(),
    moment()
      .add(9, 'hours')
      .toISOString(),
  ];
}

const ChartModal = React.memo(function ChartModal({
  item,
  open,
  onClose,
}: {
  item: Item;
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  const color = getChartColor(item.lastRate);
  const spec: TopLevelSpec = defaultsDeep(
    {
      title: item.name,
      width: Math.min(Math.max(window.innerWidth - 230, 200), 790),
      height: Math.max(window.innerHeight - 300, 200),
      encoding: {
        color: {
          value: color,
        },
        x: {
          scale: {
            domain: getChartDomain(),
          },
        },
        y: {
          scale: { domain: [0, item.maxPrice] },
        },
      },
    },
    ChartSpec,
  );
  return (
    <Modal open={open} onClose={onClose}>
      <Segment>
        {open ? <VegaLite spec={spec} data={{ data: item.values }} /> : null}
        <Button onClick={onClose}>閉じる</Button>
      </Segment>
    </Modal>
  );
});

const ChartUnderRow = React.memo(function ChartUnderRow({
  item,
  size: { width, height },
}: {
  item: Item;
  size: { width: number; height: number };
}): JSX.Element | null {
  if (!width || !height) {
    return null;
  }
  const color = getChartColor(item.lastRate);

  const spec: TopLevelSpec = defaultsDeep(
    {
      width: width,
      height: height,
      padding: 0,
      layer: [{ mark: 'area' }, { mark: 'line' }],
      encoding: {
        color: {
          value: color,
        },
        x: {
          scale: {
            domain: getChartDomain(),
          },
          axis: null,
        },
        y: {
          axis: null,
          scale: { domain: [0, item.maxPrice] },
        },
        strokeOpacity: { value: 0.25 },
        fillOpacity: { value: 0.1 },
      },
      config: {
        view: {
          stroke: 'transparent',
        },
      },
    },
    ChartSpec,
  );
  return (
    <VegaLite
      data={{ data: item.values }}
      spec={spec}
      actions={false}
      style={{ transform: 'scaleX(-1)', transformOrigin: 'center center' }}
    />
  );
});

const Row = React.memo(function Row({ item }: { item: Item }): JSX.Element {
  const color = Colors[Math.floor((Colors.length - 1) * item.lastRate)];
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [chart, setChart] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const onMouseEnter = () => setChart(true);

  useEffect((): void => {
    if (localStorage.getItem('NO_CHART_UNDER_ROW')) {
      return;
    }
    const anchor = anchorRef.current;
    if (!anchor) return;

    const tr = anchor.parentElement && anchor.parentElement.parentElement;
    if (!tr) return;
    tr.addEventListener('mouseover', onMouseEnter);

    const { offsetWidth, offsetHeight } = tr;

    const width = offsetWidth - (11 + 36);
    const height = offsetHeight - 11 * 2;
    if (width !== size.width && height !== size.height) {
      setSize({ width, height });
    }
  });

  const colStyle = {
    transform: 'translateZ(1px)',
  };

  return (
    <TableRow style={{ transformStyle: 'preserve-3d' }}>
      <TableCell textAlign="center" style={colStyle}>
        <div
          ref={anchorRef}
          style={{
            position: 'relative',
            width: 0,
            height: 0,
            overflow: 'visible',
            transform: 'translateZ(-1px)',
            left: 36,
          }}
        >
          {chart ? <ChartUnderRow item={item} size={size} /> : null}
        </div>
        <Button
          basic
          icon
          size="small"
          style={{ backgroundColor: 'white !important', ...colStyle }}
          onClick={(): void => setOpen(true)}
        >
          {item.diffRate && <DiffIcon diffRate={item.diffRate} />}
        </Button>
      </TableCell>
      <TableCell style={colStyle}>{item.name}</TableCell>
      <TableCell textAlign="right" style={colStyle}>
        {formatInteger(item.lastPrice)}
      </TableCell>
      <TableCell textAlign="right" style={colStyle}>
        {item.diffRate && formatDecimal(item.diffRate * 100)}%
      </TableCell>
      <TableCell textAlign="right" style={colStyle}>
        <Label color={color}>{formatDecimal(item.lastRate * 100)}%</Label>
      </TableCell>
      <TableCell textAlign="right" style={colStyle}>
        {formatInteger(item.minPrice)}
      </TableCell>
      <TableCell textAlign="right" style={colStyle}>
        {formatInteger(item.maxPrice)}
      </TableCell>
      <TableCell textAlign="right" style={colStyle}>
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
      if (direction == 'ascending') return sorted;

      const reversed = sorted.reverse();
      const i = sorted.findIndex(
        item => get(item, column) !== null && get(item, column) !== undefined,
      );
      if (i <= 0) return reversed;

      return [...reversed.slice(i), ...reversed.slice(0, i)];
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
