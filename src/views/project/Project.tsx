import React, { useEffect, useState } from 'react';
import _ from 'lodash';
import withUser, { WithUserProps } from '../../enhancers/withUser';
import withFirebaseApp from '../../enhancers/withFirebaseApp';
import {
  Loader,
  Container,
  Pagination,
  Segment,
  FormSelect,
  Form,
  FormInput,
  Grid,
} from 'semantic-ui-react';
import { formatZeny, formatPercent } from '../../utilities/format';
import ItemTable, { TableItem, isTableItem } from '../../components/ItemTable';
import StatField from '../../types/StatField';
import PriceStats from '../../types/PriceStats';
import { useParams } from 'react-router';

const statFields: StatField[] = [
  {
    text: '現価/変動幅',
    path: 'endByFluctuationRate',
    format: formatPercent,
    factor: 100,
    colorFactor: 1,
    colorBias: 0,
    textAlign: 'center',
  },
  {
    text: '現価',
    path: 'end',
    format: formatZeny,
  },
  {
    text: '増減',
    path: 'variationRate',
    format: formatPercent,
    colorFactor: 0.5,
    colorBias: 1,
    factor: 100,
  },
  {
    text: '最低',
    path: 'min',
    format: formatZeny,
  },
  {
    text: '最高',
    path: 'max',
    format: formatZeny,
  },
  {
    text: '変動幅',
    path: 'fluctuationRate',
    format: formatPercent,
    factor: 100,
    colorFactor: 100 / 500,
    colorBias: 1,
    textAlign: 'center',
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

    const [sortBy, setSortBy] = useState<
      keyof PriceStats | 'name' | 'updatedAt'
    >('fluctuationRate');
    const [sortOrder, setSortOrder] = useState<'ascending' | 'descending'>(
      'descending',
    );

    const [items, setItems] = useState<TableItem[]>([]);

    const [selectedFilter, setSelectedFilter] = useState<number>(0);

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
        Boolean(!search || search.split(/\s/g).some(keyword => name.match(keyword))),
      );
    const totalPages = items ? Math.ceil(filtered.length / itemsPerPage) : 1;

    const sortIteratee = ({
      item: { name, priceStats, updatedAt },
    }: TableItem): number | string | null => {
      if (sortBy === 'name') return name;
      if (sortBy === 'updatedAt')
        return updatedAt ? updatedAt.toMillis() : null;
      if (!priceStats) return null;

      const value = priceStats[sortBy];
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
    return (
      <Container>
        <Segment>
          <Form>
            <FormInput
              label="検索"
              value={search}
              onChange={(_e, { value }): void => setSearch(value || null)}
            />
            <FormSelect
              label="フィルター"
              options={filterOptions}
              value={selectedFilter}
              onChange={(_e, { value }): void =>
                setSelectedFilter(value as number)
              }
            />
            <FormInput
              label="表示件数"
              type="number"
              value={itemsPerPage}
              onChange={(_e, { value }): void => {
                setItemsPerPage(Number(value) || 0);
              }}
            />
          </Form>
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
      </Container>
    );
  }, true),
);
