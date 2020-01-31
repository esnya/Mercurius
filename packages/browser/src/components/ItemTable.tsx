import React, { useMemo } from 'react';
import ItemTableRow from './ItemTableRow';
import ItemTableHeader from './ItemTableHeader';
import { Table, Pagination } from 'semantic-ui-react';
import { Item, ItemConverter } from 'mercurius-core/lib/models/Item';
import usePersistentState from '../hooks/usePersistentState';
import mingo from 'mingo';
import { fromQuery } from '../firebase/observable';
import useObservable from '../hooks/useObservable';
import { simpleConverter, schemaConverter } from '../firebase/converters';
import FieldDefinition from 'mercurius-core/lib/models-next/FieldDefinition';
import { CollectionReference, DocumentReference } from '../firebase';
import Project from 'mercurius-core/lib/models-next/Project';
import ProjectSchema from 'mercurius-core/lib/models-next/Project.schema.json';
import PromiseReader from '../suspense/PromiseReader';
import { initializeFirestore } from '../firebase/firestore';

export interface ItemTableProps {
  projectId: string;
  fields: FieldDefinition[];
  filters: {}[];
}

const firestoreReader = new PromiseReader(initializeFirestore);

function projectCollection(
  firestore: firebase.firestore.Firestore,
): CollectionReference<Project> {
  return firestore
    .collection('projects')
    .withConverter(schemaConverter<Project>(ProjectSchema));
}

function itemCollection(
  projectReference: DocumentReference<Project>,
): CollectionReference<Item> {
  return projectReference
    .collection('items')
    .withConverter(simpleConverter(ItemConverter.cast));
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

  const fieldsAggregator = useMemo(
    () =>
      new mingo.Aggregator([
        { $set: { now: new Date() } },
        ...fields.map(({ id, value }) => ({
          $set: { [`data.${id}`]: value },
        })),
      ]),
    [fields],
  );

  const listAggregator = useMemo(
    () =>
      new mingo.Aggregator([
        { $match: { $and: filters } },
        { $sort: { [`data.${sortBy}`]: sortOrder === 'ascending' ? 1 : -1 } },
      ]),
    [filters, sortBy, sortOrder],
  );

  const query = useMemo(
    () =>
      itemCollection(
        projectCollection(firestoreReader.read()).doc(projectId),
      ).withConverter(
        simpleConverter(
          data => fieldsAggregator.run<{ data: Item }>([{ data }])[0].data,
        ),
      ),
    [projectId, fieldsAggregator],
  );

  const itemSnapshots = useObservable(() => fromQuery(query));
  const items = useMemo(
    () =>
      listAggregator.run<{
        ref: DocumentReference<Item>;
        data: Item;
      }>(itemSnapshots?.docs.map(s => ({ ref: s.ref, data: s.data() })) || []),
    [listAggregator, itemSnapshots],
  );

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
