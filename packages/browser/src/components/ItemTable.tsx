import React from 'react';
import ItemTableRow from './ItemTableRow';
import ItemTableHeader from './ItemTableHeader';
import { Table, Pagination } from 'semantic-ui-react';
import { Item } from 'mercurius-core/lib/models/Item';
import { Field } from '../definitions/fields';
import { NonEmptySnapshot } from '../firebase/snapshot';
import usePersistentState from '../hooks/usePersistentState';
import mingo from 'mingo';

export interface ItemTableProps {
  items: NonEmptySnapshot<Item>[];
  fields: Field[];
  filters: {}[];
}

export default function ItemTable({
  items,
  fields,
  filters,
}: ItemTableProps): JSX.Element {
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
  const totalPages = Math.ceil(items.length / itemsPerPage);

  const agg = new mingo.Aggregator([
    ...fields.map(({ id, value }) => ({ $set: { [`data.${id}`]: value } })),
    { $match: { $and: filters } },
    { $sort: { [`data.${sortBy}`]: sortOrder === 'ascending' ? 1 : -1 } },
    { $skip: (activePage - 1) * itemsPerPage },
    { $limit: itemsPerPage },
  ]);

  const aggregated: NonEmptySnapshot<Item>[] = agg.run(items);

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
              onPageChange={(_e, { activePage }) =>
                setActivePage(activePage as number)
              }
            />
          </Table.HeaderCell>
        </Table.Row>
      </Table.Footer>
    </Table>
  );
}
