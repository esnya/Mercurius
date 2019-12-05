import React, { useEffect, useState } from 'react';
import _ from 'lodash';
import withUser, { WithUserProps } from '../enhancers/withUser';
import withFirebaseApp from '../enhancers/withFirebaseApp';
import { Loader, Container, Pagination } from 'semantic-ui-react';
import { projectId } from '../firebase';
import { formatZeny, formatPercent } from '../utilities/format';
import ItemTable, { TableItem, isTableItem } from '../components/ItemTable';
import StatField from '../types/StatField';
import PriceStats from '../types/PriceStats';

const statFields: StatField[] = [
  {
    text: '現価',
    path: 'end',
    format: formatZeny,
  },
  {
    text: '前日比',
    path: 'variationRate',
    format: formatPercent,
    factor: 100,
  },
  {
    text: '現価/変動幅',
    path: 'endByFluctuationRate',
    format: formatPercent,
    factor: 100,
    colorFactor: 1,
    textAlign: 'center',
  },
  {
    text: '底値',
    path: 'min',
    format: formatZeny,
  },
  {
    text: '天井',
    path: 'max',
    format: formatZeny,
  },
  {
    text: '変動率',
    path: 'fluctuationRate',
    format: formatPercent,
    factor: 100,
    colorFactor: 100 / 500,
    textAlign: 'center',
  },
];

export default withFirebaseApp(
  withUser(function Home({ app }: WithUserProps): JSX.Element {
    const [activePage, setActivePage] = useState(1);
    const [itemsPerPage] = useState(50);

    const [sortBy, setSortBy] = useState<keyof PriceStats | 'name'>(
      'fluctuationRate',
    );
    const [sortOrder, setSortOrder] = useState<'ascending' | 'descending'>(
      'descending',
    );

    const [items, setItems] = useState<TableItem[]>([]);

    useEffect((): (() => void) => {
      return app
        .firestore()
        .collection('projects')
        .doc(projectId)
        .collection('items')
        .orderBy('name')
        .onSnapshot(({ docs }) =>
          setItems(
            _(docs)
              .map(doc => ({ itemRef: doc.ref, item: doc.data() }))
              .filter(isTableItem)
              .value(),
          ),
        );
    }, [app]);

    if (!items) {
      return <Loader />;
    }

    const totalPages = items ? Math.ceil(items.length / itemsPerPage) : 1;

    const sortIteratee = ({
      item: { name, priceStats },
    }: TableItem): number | string | null => {
      if (sortBy === 'name') return name;
      if (!priceStats) return null;

      const value = priceStats[sortBy];
      if (typeof value === 'undefined') return null;

      return value;
    };

    const itemsInPage: TableItem[] = _(items)
      .sortBy(sortIteratee)
      .thru(items => (sortOrder === 'ascending' ? items : items.reverse()))
      .partition(item => sortIteratee(item) !== null)
      .thru(([a, b]) => [...a, ...b])
      .drop((activePage - 1) * itemsPerPage)
      .take(itemsPerPage)
      .value();

    return (
      <Container>
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
        <Pagination
          activePage={activePage}
          totalPages={totalPages}
          onPageChange={(_e, { activePage }): void =>
            setActivePage(Number(activePage))
          }
        />
      </Container>
    );
  }, true),
);
