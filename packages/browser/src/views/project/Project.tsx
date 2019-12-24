import React, { useEffect, useState, Dispatch, SetStateAction } from 'react';
import _ from 'lodash';
import {
  Loader,
  Container,
  Pagination,
  Segment,
  Form,
  Grid,
  Accordion,
  Dimmer,
  Message,
} from 'semantic-ui-react';
import { formatPercent, formatInteger } from '../../utilities/format';
import ItemTable, { TableItem } from '../../components/ItemTable';
import StatField from '../../types/StatField';
import PriceStats from '../../types/PriceStats';
import { useParams } from 'react-router';
import mingo from 'mingo';
import ActionButton from '../../components/ActionButton';
import { Timestamp } from '../../firebase';
import { useDocumentSnapshot, useQuerySnapshot } from '../../hooks/useSnapshot';
import { isItem } from '../../types/Item';
import useFirebase from '../../hooks/useFirebase';
import { isSucceeded, isFailed } from '../../utilities/types';

function isDefined<T>(value?: T | null): value is T {
  return value !== undefined && value !== null;
}

function usePersistentState<S>(
  key: string,
  initialState?: S,
): [S, Dispatch<SetStateAction<S>>] {
  const [state, dispatch] = useState<S>(
    (): S => {
      const json = localStorage.getItem(key);
      const parsed = json && JSON.parse(json);
      return isDefined(parsed) ? parsed : initialState;
    },
  );

  const save = _.debounce((value: S) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, 1000);

  useEffect(() => {
    save(state);
  }, [state]);

  return [state, dispatch];
}

const statFieldDefinitions: Record<string, StatField> = {
  価格: {
    text: '価格',
    path: 'priceStats.end',
    format: formatInteger,
    textAlign: 'right',
  },
  騰落率: {
    text: '騰落率',
    path: 'dailyStats.1.roid',
    format: formatPercent,
    factor: 100,
    color: {
      factor: 1 / 0.2 / 2,
      minus: true,
    },
    textAlign: 'right',
  },
  前日騰落率: {
    text: '前日騰落率',
    path: 'dailyStats.2.roid',
    format: formatPercent,
    factor: 100,
    color: {
      factor: 1 / 0.2 / 2,
      minus: true,
    },
    textAlign: 'right',
  },
  前日: {
    text: '前日',
    path: 'dailyStats.1.avg',
    format: formatInteger,
    textAlign: 'right',
  },
  前々日: {
    text: '前々日',
    path: 'dailyStats.1.avg',
    format: formatInteger,
    textAlign: 'right',
  },
  月間最安値: {
    text: '月間最安値',
    path: 'priceStats.min',
    format: formatInteger,
    textAlign: 'right',
  },
  月間最高値: {
    text: '月間最高値',
    path: 'priceStats.max',
    format: formatInteger,
    textAlign: 'right',
  },
  月間価格差: {
    text: '月間価格差',
    path: 'priceStats.fluctuationRate',
    format: formatPercent,
    factor: 100,
    color: {
      factor: 0.1,
    },
  },
  '現価/変動幅': {
    text: '現価/変動幅',
    path: 'priceStats.endByFluctuationRate',
    format: formatPercent,
    factor: 100,
    color: {},
    textAlign: 'center',
  },
};

interface Filter {
  text: string;
  filter: (
    priceStats: PriceStats,
    dailyStats?: Record<string, { avg: number; roid?: number }>,
  ) => boolean;
  allowNoStats?: boolean;
}
const filters: Filter[] = [
  {
    text: 'すべて',
    filter: (): boolean => true,
    allowNoStats: true,
  },
  {
    text: '買い',
    filter: (
      { endByFluctuationRate }: PriceStats,
      dailyStats?: Record<string, { avg: number; roid?: number }>,
    ): boolean => {
      const roid = _.get(dailyStats, '1.roid', NaN) as number;
      return (
        (endByFluctuationRate < 0.1 && roid > 0) ||
        (endByFluctuationRate === 0 && roid > -0.1)
      );
    },
  },
  {
    text: '売り',
    filter: (
      { endByFluctuationRate }: PriceStats,
      dailyStats?: Record<string, { avg: number; roid?: number }>,
    ): boolean => {
      const roid1 = _.get(dailyStats, '1.roid', NaN) as number;
      const roid2 = _.get(dailyStats, '2.roid', NaN) as number;

      return (
        (endByFluctuationRate > 0.4 && roid1 > -0.1) ||
        (endByFluctuationRate > 0.1 && roid1 > 0.1 && roid2 > 0.1)
      );
    },
  },
  {
    text: '底',
    filter: ({ variationRate, endByFluctuationRate }: PriceStats): boolean =>
      variationRate !== undefined &&
      variationRate > -0.01 &&
      endByFluctuationRate <= 0.2,
  },
  {
    text: '天井',
    filter: ({ variationRate, endByFluctuationRate }: PriceStats): boolean =>
      variationRate !== undefined &&
      variationRate < 0.01 &&
      endByFluctuationRate >= 0.8,
  },
  {
    text: '最高値',
    filter: ({ end, max }: PriceStats): boolean => end === max,
  },
  {
    text: '最安値',
    filter: ({ end, min }: PriceStats): boolean => end === min,
  },
  {
    text: '横ばい',
    filter: ({ variationRate }: PriceStats): boolean =>
      variationRate !== undefined && Math.abs(variationRate) < 0.01,
  },
  {
    text: '上げ',
    filter: ({ variationRate }: PriceStats): boolean =>
      variationRate !== undefined && variationRate >= 0.01,
  },
  {
    text: '下げ',
    filter: ({ variationRate }: PriceStats): boolean =>
      variationRate !== undefined && variationRate <= -0.01,
  },
  {
    text: '現価/変動幅 10%以下',
    filter: ({ endByFluctuationRate }: PriceStats): boolean =>
      endByFluctuationRate <= 0.1,
  },
  {
    text: '現価/変動幅 50%以上',
    filter: ({ endByFluctuationRate }: PriceStats): boolean =>
      endByFluctuationRate >= 0.1,
  },
];

export default function Project(): JSX.Element {
  const { projectId } = useParams();
  const app = useFirebase();
  const project = useDocumentSnapshot(
    (firestore, projectId) => firestore.collection('projects').doc(projectId),
    (snapshot): { name: string; owner: string } | null => {
      return snapshot.data() as { name: string; owner: string };
    },
    projectId,
  );
  const items = useQuerySnapshot(
    (firestore, projectId) =>
      firestore
        .collection('projects')
        .doc(projectId)
        .collection('items'),
    (snapshot): TableItem | null => {
      const item = snapshot.data();
      if (!isItem(item)) return null;

      const { dailyStats } = item;

      return {
        itemRef: snapshot.ref,
        item: {
          ...item,
          dailyStats:
            dailyStats &&
            _.mapValues(dailyStats, (value, key) => {
              if (!item.priceStats || !value.avg || key === '0') return value;
              const prevStats = dailyStats[`${Number(key) - 1}`];
              const prevPrice =
                key === '1' ? item.priceStats.end : prevStats && prevStats.avg;
              if (!prevPrice) return value;

              return {
                ...value,
                roid: (prevPrice - value.avg) / value.avg,
              };
            }),
        },
      };
    },
    projectId,
  );

  const [selectedStatFields, setSelectedStatFields] = usePersistentState<
    string[]
  >('selectedStatFields', _.keys(statFieldDefinitions));
  const statFields = selectedStatFields.map(key => statFieldDefinitions[key]);

  const [activePage, setActivePage] = usePersistentState('activePage', 1);
  const [itemsPerPage, setItemsPerPage] = usePersistentState(
    'itemsPerPage',
    50,
  );
  const [search, setSearch] = usePersistentState<string | null>('search', null);

  const [sortBy, setSortBy] = usePersistentState<string>(
    'sortBy',
    'priceStats.fluctuationRate',
  );
  const [sortOrder, setSortOrder] = usePersistentState<
    'ascending' | 'descending'
  >('sortOrder', 'descending');

  const [selectedFilter, setSelectedFilter] = usePersistentState<number>(
    'selectedFilter',
    0,
  );
  const [filterActive, setFilterActive] = usePersistentState<boolean>(
    'filterActive',
    false,
  );
  const [mingoQuery, setMingoQuery] = useState<mingo.Query>();
  const [mingoQueryJson, setMingoQueryJson] = useState<string>();

  useEffect((): void => {
    if (!mingoQueryJson) {
      setMingoQuery(undefined);
    } else {
      try {
        setMingoQuery(new mingo.Query(JSON.parse(mingoQueryJson)));
      } catch (e) {
        console.log(e);
      }
    }
  }, [mingoQueryJson]);

  if (isFailed(project) || isFailed(items)) {
    const messages = [project, items]
      .filter((e): e is Error => e instanceof Error)
      .map((e, i) => (
        <Message key={i} negative>
          {(e.stack || e).toString()}
        </Message>
      ));
    return <Container>{messages}</Container>;
  }

  if (!project || !items) {
    return (
      <Dimmer active>
        <Loader />
      </Dimmer>
    );
  }

  const filtered: TableItem[] = items
    .map(({ data }) => data)
    .filter(({ item: { priceStats, dailyStats } }) => {
      const { filter, allowNoStats } = filters[selectedFilter];

      return priceStats
        ? filter(priceStats, dailyStats)
        : Boolean(allowNoStats);
    })
    .filter(({ item: { name } }): boolean =>
      Boolean(
        !search ||
          search
            .split(/\s+/g)
            .filter(k => k)
            .some(keyword => name.match(keyword)),
      ),
    )
    .filter(({ item }): boolean => !mingoQuery || mingoQuery.test(item));
  const totalPages = items ? Math.ceil(filtered.length / itemsPerPage) : 1;

  const sortIteratee = ({
    item: { name, updatedAt, ...item },
  }: TableItem): number | string | null => {
    if (sortBy === 'name') return name;
    if (sortBy === 'updatedAt') return updatedAt ? updatedAt.toMillis() : null;

    const value = _.get(item, sortBy);
    if (typeof value === 'undefined') return null;

    return value;
  };

  const itemsInPage: TableItem[] = _(filtered)
    .sortBy(sortIteratee)
    .thru(items => (sortOrder === 'ascending' ? items : items.reverse()))
    .partition(item => sortIteratee(item) !== null)
    .thru(([a, b]) => [...a, ...b])
    .drop((activePage - 1) * itemsPerPage)
    .take(itemsPerPage)
    .value();

  const filterOptions = filters.map((f, i) => ({ text: f.text, value: i }));

  const exportAsCsv = async (): Promise<void> => {
    if (!isSucceeded(app)) return;

    const firestore = app.firestore();
    const items = await firestore
      .collection('projects')
      .doc(projectId)
      .collection('items')
      .get();

    const lines = _.flatten(
      await items.docs
        .map(async itemSnapshot => {
          const snapshot = await itemSnapshot.ref
            .collection('prices')
            .orderBy('timestamp', 'desc')
            .get();
          return snapshot.docs.map((priceSnapshot): string => {
            const timestamp = priceSnapshot.get('timestamp') as Timestamp;
            const name = itemSnapshot.get('name') as string;
            const price = priceSnapshot.get('price') as number;
            const lottery = priceSnapshot.get('lottery') as boolean;

            return [
              timestamp.toDate().toISOString(),
              name,
              price,
              lottery,
            ].join(',');
          });
        })
        .reduce(async (p, c): Promise<string[][]> => {
          return [...(await p), await c];
        }, Promise.resolve([] as string[][])),
    );

    const csv = new File(
      [['timestamp, name, price, lottery', ...lines].join('\n')],
      'csv',
      { type: 'text/csv' },
    );

    const a = document.createElement('a');
    a.href = URL.createObjectURL(csv);
    a.download = `${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <Container>
      <Segment>
        <Accordion fluid>
          <Accordion.Title
            active={filterActive}
            onClick={(): void => setFilterActive(b => !b)}
          ></Accordion.Title>
          <Accordion.Content active={filterActive}>
            <Form id={`mercurius-project-${projectId}`}>
              <Form.Input
                label="キーワード"
                name="search"
                value={search}
                onChange={(_e, { value }): void => setSearch(value || null)}
              />
              <Form.Select
                label="フィルター"
                name="filter"
                options={filterOptions}
                value={selectedFilter}
                onChange={(_e, { value }): void =>
                  setSelectedFilter(value as number)
                }
              />
              <Form.Input
                label="表示件数"
                name="items-per-page"
                type="number"
                value={itemsPerPage}
                onChange={(_e, { value }): void => {
                  setItemsPerPage(Number(value) || 0);
                }}
              />
              <Form.Select
                label="カラム"
                multiple
                name="stat-fields"
                value={selectedStatFields}
                options={_.map(statFieldDefinitions, ({ text }, key) => ({
                  text,
                  value: key,
                }))}
                onChange={(_e, { value }): void =>
                  setSelectedStatFields(value as string[])
                }
              />
              <Form.TextArea
                label="高度な検索 (mingo)"
                name="mingo"
                value={mingoQueryJson || ''}
                onChange={(_e, { value }): void =>
                  setMingoQueryJson(
                    typeof value === 'string' ? value : undefined,
                  )
                }
              />
            </Form>
          </Accordion.Content>
        </Accordion>
      </Segment>
      <Grid centered>
        <Grid.Column textAlign="center">
          <Pagination
            activePage={activePage}
            totalPages={totalPages}
            onPageChange={(_e, { activePage }): void =>
              setActivePage(Number(activePage))
            }
          />
        </Grid.Column>
      </Grid>
      <ItemTable
        statFields={statFields}
        items={itemsInPage}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(path): void => {
          if (path === sortBy) {
            setSortOrder(
              sortOrder === 'ascending' ? 'descending' : 'ascending',
            );
          } else {
            setSortBy(path);
            setSortOrder('descending');
          }
        }}
      />
      <Grid centered>
        <Grid.Column textAlign="center">
          <Pagination
            activePage={activePage}
            totalPages={totalPages}
            onPageChange={(_e, { activePage }): void =>
              setActivePage(Number(activePage))
            }
          />
        </Grid.Column>
      </Grid>
      <Segment>
        <ActionButton action={exportAsCsv}>CSVエクスポート</ActionButton>
      </Segment>
    </Container>
  );
}
