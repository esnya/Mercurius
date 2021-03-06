import React, { Fragment, useEffect } from 'react';
import ItemTableRow from './ItemTableRow';
import ItemTableHeader from './ItemTableHeader';
import { Table, Pagination, Dimmer, Loader } from 'semantic-ui-react';
import ProjectState from '../states/ProjectState';
import { useObserver } from 'mobx-react-lite';

const headers = [
  { id: 'name', value: 'name', text: 'アイテム' },
  { id: 'last30Days.closing.price', text: '価格' },
  {
    id: 'daily.%today%.fluctuationRate',
    text: '日間騰落率',
  },
  {
    id: 'last30Days.minMaxRate',
    text: '月間騰落率',
  },
  {
    id: 'indices.%nextTimeUnit%.purchase',
    text: '買い指数',
  },
  {
    id: 'indices.%nextTimeUnit%.divestment',
    text: '売り指数',
  },
  { id: 'updatedAt', text: '更新日時' },
  {},
];
export interface ItemTableProps {
  state: ProjectState;
}

export default function ItemTable({ state }: ItemTableProps): JSX.Element {
  useEffect(() => {
    document.body.scroll({ top: 0 });
  }, [state.activePage]);

  return useObserver(() => {
    const itemsPerPage = 50;
    const { itemQuerySnapshots: sorted } = state;
    if (!sorted) {
      return (
        <Dimmer active>
          <Loader />
        </Dimmer>
      );
    }

    const totalPages = Math.ceil((sorted.length || 0) / itemsPerPage) || 1;
    const rows = sorted
      .slice(
        (state.activePage - 1) * itemsPerPage,
        state.activePage * itemsPerPage,
      )
      .map(
        (itemSnapshot): JSX.Element => {
          return (
            <ItemTableRow
              key={itemSnapshot.ref.id}
              itemSnapshot={itemSnapshot}
            />
          );
        },
      );

    return (
      <Fragment>
        <Table sortable>
          <ItemTableHeader
            headers={headers}
            keywords={state.keywords ?? null}
            sortBy={state.sortBy}
            sortOrder={state.sortOrder === 'asc' ? 'ascending' : 'descending'}
            onSortChange={(id): void => {
              state.activePage = 1;
              if (state.sortBy === id) {
                state.sortOrder = state.sortOrder === 'desc' ? 'asc' : 'desc';
              } else {
                state.sortBy = id;
                state.sortOrder = 'desc';
              }
            }}
            onKeywordsChange={(keywords): void => {
              state.keywords = keywords ?? undefined;
            }}
          />
          <Table.Body>{rows}</Table.Body>
        </Table>
        <Pagination
          activePage={state.activePage}
          totalPages={totalPages}
          onPageChange={(_e, { activePage }): void => {
            state.activePage = activePage as number;
          }}
        />
      </Fragment>
    );
  });
}
