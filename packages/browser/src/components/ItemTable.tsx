import React, { useMemo } from 'react';
import ItemTableRow from './ItemTableRow';
import ItemTableHeader from './ItemTableHeader';
import { Table, Pagination, Dimmer, Loader, Message } from 'semantic-ui-react';
import { Item, ItemConverter } from 'mercurius-core/lib/models/Item';
import { Field } from '../definitions/fields';
import { NonEmptySnapshot } from '../firebase/snapshot';
import usePersistentState from '../hooks/usePersistentState';
import mingo from 'mingo';
import { useDebounce } from 'use-debounce';
import { useQuerySnapshot } from '../hooks/useSnapshot';
import { isSucceeded, isFailed } from '../utilities/types';

export interface ItemTableProps {
  projectId: string;
  fields: Field[];
  filters: {}[];
}

export default function ItemTable({
  projectId,
  fields,
  filters,
}: ItemTableProps): JSX.Element {
  const items = useQuerySnapshot(
    (firestore, projectId) =>
      firestore
        .collection('projects')
        .doc(projectId)
        .collection('items'),
    ItemConverter.cast,
    projectId,
  );

  const [sortBy, setSortBy] = usePersistentState<string>(
    'sortBy',
    'monthlyRoid',
  );
  const [sortOrder, setSortOrder] = usePersistentState<
    'ascending' | 'descending'
  >('descending');
  const [activePage, setActivePage] = usePersistentState<number>(
    'activePage',
    1,
  );

  const itemsPerPage = 50;

  const aggDepends = useDebounce(
    {
      items,
      fields,
      filters,
      sortBy,
      sortOrder,
      activePage,
      itemsPerPage,
    },
    500,
  );

  const aggregated = useMemo((): NonEmptySnapshot<Item>[] => {
    if (!isSucceeded(items)) return [];

    const agg = new mingo.Aggregator([
      ...fields.map(({ id, value }) => ({ $set: { [`data.${id}`]: value } })),
      { $match: { $and: filters } },
      { $sort: { [`data.${sortBy}`]: sortOrder === 'ascending' ? 1 : -1 } },
      { $skip: (activePage - 1) * itemsPerPage },
      { $limit: itemsPerPage },
    ]);
    return agg.run(items);
  }, aggDepends);

  if (isFailed(items)) {
    return <Message negative>{items.toString}</Message>;
  }

  if (!isSucceeded(items)) {
    return (
      <Dimmer active>
        <Loader />
      </Dimmer>
    );
  }

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const rows = aggregated.map(
    (item): JSX.Element => {
      return <ItemTableRow key={item.ref.id} item={item} fields={fields} />;
    },
  );
  return (
    <Table sortable>
      <ItemTableHeader
        fields={fields}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(id): void => {
          if (sortBy === id) {
            setSortOrder('ascending');
          }
          setSortOrder('descending');
          setSortBy(id);
        }}
      />
      <Table.Body>{rows}</Table.Body>
      <Table.Footer>
        <Table.Row>
          <Table.HeaderCell colSpan={fields.length + 3} textAlign="center">
            <Pagination
              activePage={activePage}
              totalPages={totalPages}
              onPageChange={(_e, { activePage }): void =>
                setActivePage(activePage as number)
              }
            />
          </Table.HeaderCell>
        </Table.Row>
      </Table.Footer>
    </Table>
  );
}
