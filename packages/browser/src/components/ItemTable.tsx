import React from 'react';
import ItemTableRow from './ItemTableRow';
import ItemTableHeader from './ItemTableHeader';
import { Table, Pagination } from 'semantic-ui-react';
import { Item, ItemConverter } from 'mercurius-core/lib/models/Item';
import { QuerySnapshot } from '../firebase/snapshot';
import usePersistentState from '../hooks/usePersistentState';
import mingo from 'mingo';
import { initializeFirestore } from '../firebase/firestore';
import { map, flatMap, throttleTime } from 'rxjs/operators';
import { from, Observable } from 'rxjs';
import { fromQuery } from '../firebase/observable';
import useObservable from '../hooks/useObservable';
import { simpleConverter } from '../firebase/converters';
import { FieldDefinition } from 'mercurius-core/lib/models-next/FieldDefinition';
import { DateTime, Duration } from 'luxon';

export interface ItemTableProps {
  projectId: string;
  fields: FieldDefinition[];
  filters: {}[];
}

export default function ItemTable({
  projectId,
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

  const items = useObservable((): Observable<QuerySnapshot<Item>> => {
    return from(initializeFirestore()).pipe(
      map(firestore =>
        firestore
          .collection('projects')
          .doc(projectId)
          .collection('items')
          .withConverter(simpleConverter(ItemConverter.cast)),
      ),
      throttleTime(500),
      flatMap(query => fromQuery(query)),
      map(snapshot => {
        const now = DateTime.local()
          .minus(Duration.fromObject({ minutes: DateTime.local().offset }))
          .toJSDate();
        const agg = new mingo.Aggregator([
          { $set: { now } },
          ...fields.map(({ id, value }) => ({
            $set: { [`data.${id}`]: value },
          })),
          { $match: { $and: filters } },
          { $sort: { [`data.${sortBy}`]: sortOrder === 'ascending' ? 1 : -1 } },
        ]);
        const items = snapshot.docs.map(doc => ({
          ref: doc.ref,
          data: doc.data(),
        }));
        return agg.run(items);
      }),
    );
  }, [projectId, fields, filters, sortBy, sortOrder]);

  const totalPages = items ? Math.ceil(items.length / itemsPerPage) : 1;
  const rows = items
    ?.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage)
    .map(
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
