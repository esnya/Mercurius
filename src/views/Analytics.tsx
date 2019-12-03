import React, { useState, useEffect } from 'react';
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
  FormSelect,
  Form,
  Pagination,
  Loader,
  Image,
  ModalContent,
  ModalActions,
  FormInput,
} from 'semantic-ui-react';
import get from 'lodash/get';
import sortBy from 'lodash/sortBy';
import {
  formatInteger,
  formatDecimal,
  formatTimestamp,
} from '../utilities/format';
import moment, { Moment } from 'moment';
import DiffIcon from '../components/DiffIcon';
import renderChart from '../chart';
import { search } from '../elasticsearch';

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
  maxTimestamp: number;
  minTimestamp: number;
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

function getDomain(): [Moment, Moment] {
  return [
    moment()
      .subtract(14, 'days')
      .add(9, 'hours'),
    moment().add(9, 'hours'),
  ];
}

function getChartDomain(): [string, string] {
  return getDomain().map(m => m.toISOString()) as [string, string];
}

function ChartModal({
  item,
  open,
  onClose,
}: {
  item: Item;
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      const color = getChartColor(item.lastRate);
      renderChart(
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
        item.values,
      ).then(setUrl, console.error);
    }
  });

  return (
    <Modal open={open} onClose={onClose}>
      <ModalContent image>
        {url ? <Image src={url} /> : <Loader />}
      </ModalContent>
      <ModalActions>
        <Button onClick={onClose}>閉じる</Button>
      </ModalActions>
    </Modal>
  );
}

async function renderBackgroundChart(item: Item): Promise<string> {
  const { values: data } = item;

  const url = await renderChart(
    {
      width: 1024,
      height: 1024,
      padding: 0,
      layer: [{ mark: 'area' }, { mark: 'line' }],
      encoding: {
        color: {
          value: getChartColor(item.lastRate),
        },
        x: {
          scale: {
            domain: getChartDomain(),
          },
          sort: 'descending',
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
    data,
  );

  return url;
}

function Row({ item }: { item: Item }): JSX.Element {
  const color = Colors[Math.floor((Colors.length - 1) * item.lastRate)];
  const [open, setOpen] = useState(false);

  const [background, setBackground] = useState<string | null>(null);
  useEffect(() => {
    if (!background) {
      renderBackgroundChart(item).then(setBackground, console.error);
    }
  });

  return (
    <TableRow
      style={{
        backgroundImage: background && `url(${background})`,
        backgroundSize: '100% 100%',
      }}
    >
      <TableCell textAlign="center">
        <Button basic icon size="small" onClick={(): void => setOpen(true)}>
          {item.diffRate && <DiffIcon diffRate={item.diffRate} />}
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
      <TableCell>{formatTimestamp(item.maxTimestamp)}</TableCell>
      <TableCell>{formatTimestamp(item.minTimestamp)}</TableCell>
      <ChartModal
        item={item}
        open={open}
        onClose={(): void => setOpen(false)}
      />
    </TableRow>
  );
}

function sortPredicate(column: string) {
  return (item: Item): string | number => get(item, column);
}

function itemFilter(filter: string): (item: Item) => boolean {
  return (item: Item): boolean => {
    switch (filter) {
      case 'buy':
        return (
          (item.diffRate && item.diffRate > -0.01 && item.lastRate <= 0.1) ||
          false
        );
      case 'sell':
        return (
          ((!item.diffRate || item.diffRate > 0) && item.lastRate >= 0.4) ||
          false
        );
      case 'high':
        return item.lastRate > 0.9;
      case 'low':
        return item.lastRate < 0.1;
      case 'increase':
        return (item.diffRate && item.diffRate > 0.01) || false;
      case 'decrease':
        return (item.diffRate && item.diffRate < -0.01) || false;
      case 'flat':
        return (item.diffRate && Math.abs(item.diffRate) < 0.01) || false;
      default:
        return true;
    }
  };
}

async function getItems(): Promise<Item[]> {
  const res = await search('mercurius-trading', {
    size: 0,
    aggs: {
      name_buckets: {
        terms: {
          field: 'name.keyword',
          size: 10000,
        },
        aggs: {
          timestampStats: {
            extended_stats: {
              field: 'timestamp',
            },
          },
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
  });

  const domain = getDomain();
  const items = res.aggregations.name_buckets.buckets.map(bucket => {
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
    const totalRate = totalDiff === 0 ? 0 : (maxPrice - minPrice) / minPrice;
    const lastRate = totalDiff === 0 ? 0 : (lastPrice - minPrice) / totalDiff;

    // console.log(dateBuckets[0].key, ...domain.map(d => d.unix()));
    const values = dateBuckets
      .filter(
        b =>
          Number(b.key) >= domain[0].toDate().getTime() &&
          Number(b.key) <= domain[1].toDate().getTime() &&
          b.stats.avg,
      )
      .map(b => ({
        timestamp: (b.key as unknown) as number,
        value: b.stats.avg,
      }));

    const { min: minTimestamp, max: maxTimestamp } = bucket.timestampStats;

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
      minTimestamp,
      maxTimestamp,
    };
  });

  return items;
}

interface SortOptions {
  column: keyof Item;
  direction: 'ascending' | 'descending';
}
function sortItems(
  items: Item[],
  filter: string,
  { column, direction }: SortOptions,
): Item[] {
  const filtered = items.filter(itemFilter(filter));
  const sorted = sortBy(filtered, sortPredicate(column));

  if (direction == 'ascending') return sorted;

  const reversed = sorted.reverse();
  const i = sorted.findIndex(
    item => get(item, column) !== null && get(item, column) !== undefined,
  );
  if (i <= 0) return reversed;

  return [...reversed.slice(i), ...reversed.slice(0, i)];
}

export default function Analytics(): JSX.Element {
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [sort, setSort] = useState<SortOptions>({
    column: 'totalRate',
    direction: 'descending',
  });
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(0);
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect((): void => {
    if (!items) {
      getItems().then(setItems, console.error);
    }
  });

  const sorted = items && sortItems(items, filter, sort);
  const pages = sorted ? Math.ceil(sorted.length / itemsPerPage) : 1;

  const rows = sorted ? (
    sorted
      .slice(page * itemsPerPage, (page + 1) * itemsPerPage)
      .map(item => <Row key={item.name} item={item} />)
  ) : (
    <TableRow>
      <TableCell colSpan="10">
        <Loader />
      </TableCell>
    </TableRow>
  );

  const headerCell = (
    column: keyof Item,
    label: string | JSX.Element,
    textAlign?: 'center',
  ): JSX.Element => {
    const sorted = sort.column === column ? sort.direction : undefined;
    const onClick = (): void => {
      setSort({
        column,
        direction:
          sort.column === column && sort.direction === 'descending'
            ? 'ascending'
            : 'descending',
      });
    };

    return (
      <TableHeaderCell sorted={sorted} textAlign={textAlign} onClick={onClick}>
        {label}
      </TableHeaderCell>
    );
  };

  return (
    <Container>
      <Segment>
        <Form>
          <FormSelect
            label="フィルター"
            value={filter}
            options={[
              { value: 'all', text: 'すべて' },
              { value: 'high', text: '高値' },
              { value: 'low', text: '安値' },
              { value: 'increase', text: '上昇' },
              { value: 'decrease', text: '下降' },
              { value: 'sell', text: '売り' },
              { value: 'buy', text: '買い' },
            ]}
            onChange={(_e, { value }): void => setFilter(`${value || 'all'}`)}
          />
          <FormInput
            type="number"
            label="1ページの表示件数"
            value={itemsPerPage}
            onChange={(_e, { value }): void => {
              const next = Number(value);
              if (next > 0) setItemsPerPage(next);
            }}
          />
        </Form>
      </Segment>
      <Table sortable stackable={false}>
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
            {headerCell('maxTimestamp', '最終更新日時')}
            {headerCell('minTimestamp', '登録日時')}
          </TableRow>
        </TableHeader>
        <TableBody>{rows}</TableBody>
      </Table>
      <Pagination
        totalPages={pages}
        activePage={page + 1}
        firstItem={{
          content: <Icon name="angle double left" />,
          icon: true,
        }}
        lastItem={{
          content: <Icon name="angle double right" />,
          icon: true,
        }}
        prevItem={{ content: <Icon name="angle left" />, icon: true }}
        nextItem={{ content: <Icon name="angle right" />, icon: true }}
        onPageChange={(_e, { activePage }): void =>
          setPage(Number(activePage) - 1 || 0)
        }
      />
    </Container>
  );
}
