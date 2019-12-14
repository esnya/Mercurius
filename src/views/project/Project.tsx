import React, { useEffect, useState } from 'react';
import _ from 'lodash';
import withUser, { WithUserProps } from '../../enhancers/withUser';
import withFirebaseApp from '../../enhancers/withFirebaseApp';
import {
  Loader,
  Container,
  Pagination,
  Segment,
  Form,
  Grid,
  Accordion,
} from 'semantic-ui-react';
import { formatPercent, formatInteger } from '../../utilities/format';
import ItemTable, { TableItem, isTableItem } from '../../components/ItemTable';
import StatField from '../../types/StatField';
import PriceStats from '../../types/PriceStats';
import { useParams } from 'react-router';
import mingo from 'mingo';
import ActionButton from '../../components/ActionButton';
import { Timestamp } from '../../firebase';

const statFields: StatField[] = [
  {
    text: '現価/変動幅',
    path: 'priceStats.endByFluctuationRate',
    format: formatPercent,
    factor: 100,
    colorFactor: 1,
    colorBias: 0,
    textAlign: 'center',
  },
  {
    text: '現価',
    path: 'priceStats.end',
    format: formatInteger,
  },
  {
    text: '増減',
    path: 'priceStats.variationRate',
    format: formatPercent,
    colorFactor: 0.5,
    colorBias: 1,
    factor: 100,
  },
  {
    text: '最低',
    path: 'priceStats.min',
    format: formatInteger,
  },
  {
    text: '最高',
    path: 'priceStats.max',
    format: formatInteger,
  },
  {
    text: '変動幅',
    path: 'priceStats.fluctuationRate',
    format: formatPercent,
    factor: 100,
    colorFactor: 100 / 500,
    colorBias: 1,
    textAlign: 'center',
  },
  {
    text: '騰落率（前日）',
    path: 'dailyStats.1.roid',
    format: formatPercent,
    factor: 100,
  },
  {
    text: '騰落率（前々日）',
    path: 'dailyStats.2.roid',
    format: formatPercent,
    factor: 100,
  },
];

interface Filter {
  text: string;
  filter: (priceStats: PriceStats) => boolean;
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
    filter: ({ variationRate, endByFluctuationRate }: PriceStats): boolean =>
      variationRate !== undefined &&
      ((variationRate > 0.01 && endByFluctuationRate <= 0.2) ||
        (variationRate > -0.1 && endByFluctuationRate <= 0.05)),
  },
  {
    text: '売り',
    filter: ({ variationRate, endByFluctuationRate }: PriceStats): boolean =>
      (!variationRate || variationRate > 0.01) && endByFluctuationRate >= 0.5,
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

export default withFirebaseApp<{}>(
  withUser(function Home({ app }: WithUserProps): JSX.Element | null {
    const { projectId } = useParams();
    if (typeof projectId !== 'string') return null;

    const [activePage, setActivePage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [search, setSearch] = useState<string | null>(null);

    const [sortBy, setSortBy] = useState<string>('priceStats.fluctuationRate');
    const [sortOrder, setSortOrder] = useState<'ascending' | 'descending'>(
      'descending',
    );

    const [items, setItems] = useState<TableItem[]>([]);
    const [selectedFilter, setSelectedFilter] = useState<number>(0);
    const [filterActive, setFilterActive] = useState(false);
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

    useEffect((): (() => void) => {
      return app
        .firestore()
        .collection('projects')
        .doc(projectId)
        .collection('items')
        .orderBy('name')
        .onSnapshot(({ docs }) => {
          const items = _(docs)
            .map(doc => ({ itemRef: doc.ref, item: doc.data() }))
            .filter(isTableItem)
            .map(({ item: { dailyStats, ...item }, ...others }) => ({
              ...others,
              item: {
                ...item,
                dailyStats:
                  dailyStats &&
                  _(dailyStats)
                    .mapValues((value, key) => {
                      if (!item.priceStats || !value.avg || key === '0')
                        return value;
                      const prevStats = dailyStats[`${Number(key) - 1}`];
                      const prevPrice =
                        key === '1'
                          ? item.priceStats.end
                          : prevStats && prevStats.avg;
                      if (!prevPrice) return value;

                      return {
                        ...value,
                        roid: (prevPrice - value.avg) / value.avg,
                      };
                    })
                    .value(),
              },
            }))
            .value();
          setItems(items);
        });
    }, [app]);

    if (!items) {
      return <Loader />;
    }

    const filtered: TableItem[] = items
      .filter(({ item: { priceStats } }) => {
        const { filter, allowNoStats } = filters[selectedFilter];

        return priceStats ? filter(priceStats) : Boolean(allowNoStats);
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
      if (sortBy === 'updatedAt')
        return updatedAt ? updatedAt.toMillis() : null;

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
  }, true),
);
