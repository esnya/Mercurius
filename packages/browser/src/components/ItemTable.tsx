import React, { useMemo } from 'react';
import ItemTableRow from './ItemTableRow';
import ItemTableHeader from './ItemTableHeader';
import { Table, Pagination } from 'semantic-ui-react';
import usePersistentState from '../hooks/usePersistentState';
import { fromQuery } from '../firebase/observable';
import useObservable from '../hooks/useObservable';
import { schemaConverter } from '../firebase/converters';
import { CollectionReference, DocumentReference } from '../firebase';
import Item from 'mercurius-core/lib/models-next/Item';
import ItemSchema from 'mercurius-core/lib/models-next/Item.schema.json';
import Project from 'mercurius-core/lib/models-next/Project';
import ProjectSchema from 'mercurius-core/lib/models-next/Project.schema.json';
import PromiseReader from '../suspense/PromiseReader';
import { initializeFirestore } from '../firebase/firestore';
import _ from 'lodash';
import { replaceTimestamps } from '../utilities/path';
import { isDefined } from '../utilities/types';

const headers = [
  { id: 'name', value: 'name', text: 'アイテム' },
  { id: 'price', value: 'last30Days.closing.price', text: '価格' },
  {
    id: 'dailyRate',
    value: 'daily.%today%.fluctuationRate',
    text: '日間騰落率',
  },
  {
    id: 'monthlyRate',
    value: 'last30Days.minMaxRate',
    text: '月間騰落率',
  },
  {
    id: 'purchase',
    value: 'indices.%nextTimeUnit%.purchase',
    text: '買い指数',
  },
  {
    id: 'divestment',
    value: 'indices.%nextTimeUnit%.divestment',
    text: '売り指数',
  },
  { id: 'updatedAt', value: 'updatedAt', text: '更新日時' },
  {},
];
export interface ItemTableProps {
  projectId: string;
}

const firestoreReader = new PromiseReader(initializeFirestore);

function projectCollection(
  firestore: firebase.firestore.Firestore,
): CollectionReference<Project> {
  return firestore.collection('projects').withConverter(
    schemaConverter<Project>(ProjectSchema, snapshot => ({
      title: snapshot.get('title'),
      owner: snapshot.get('owner') ?? 'unknown',
    })),
  );
}

function itemCollection(
  projectReference: DocumentReference<Project>,
): CollectionReference<Item> {
  return projectReference.collection('items').withConverter(
    schemaConverter<Item>(ItemSchema, snapshot => {
      const name = snapshot.get('name');
      const indices = snapshot.get('indices');

      return {
        name,
        indices: Array.isArray(indices)
          ? _.fromPairs(indices.map(i => [`${i.timestamp}`, i]))
          : typeof indices === 'object'
          ? indices
          : undefined,
      };
    }),
  );
}

export default function ItemTable({ projectId }: ItemTableProps): JSX.Element {
  const [sortBy, setSortBy] = usePersistentState<string>(
    'sortBy',
    'monthlyRate',
  );
  const [sortOrder, setSortOrder] = usePersistentState<
    'ascending' | 'descending'
  >('descending');
  const [activePage, setActivePage] = usePersistentState<number>(
    'activePage',
    1,
  );
  const [keywords, setKeywords] = usePersistentState<string[] | null>(
    'keywords',
    null,
  );

  const itemsPerPage = 50;

  const query = useMemo(
    () =>
      itemCollection(projectCollection(firestoreReader.read()).doc(projectId)),
    [projectId],
  );

  const itemSnapshots = useObservable(() => fromQuery<Item>(query)) || [];
  const filtered = keywords
    ? itemSnapshots.filter(d =>
        keywords.some(keyword => d.data().name.match(keyword)),
      )
    : itemSnapshots;
  const sortColumn = headers.find(({ id }) => id === sortBy)?.value;
  const sortPath = sortColumn && replaceTimestamps(sortColumn);

  const preSorted = sortPath
    ? _.sortBy(
        filtered.filter(d => isDefined(d.get(sortPath))),
        s => s.get(sortPath),
      )
    : filtered;

  const sorted = [
    ...(sortOrder === 'descending' ? preSorted.reverse() : preSorted),
    ...(sortPath ? filtered.filter(d => !isDefined(d.get(sortPath))) : []),
  ];

  const totalPages = Math.ceil((sorted.length || 0) / itemsPerPage) || 1;
  const rows = sorted
    .slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage)
    .map(
      (itemSnapshot): JSX.Element => {
        return (
          <ItemTableRow key={itemSnapshot.ref.id} itemSnapshot={itemSnapshot} />
        );
      },
    );

  return (
    <Table sortable>
      <ItemTableHeader
        headers={headers}
        keywords={keywords}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(id): void => {
          if (sortBy === id) {
            setSortOrder('ascending');
          } else {
            setSortOrder('descending');
            setSortBy(id);
          }
        }}
        onKeywordsChange={setKeywords}
      />
      <Table.Body>{rows}</Table.Body>
      <Table.Footer>
        <Table.Row>
          <Table.HeaderCell colSpan={headers.length} textAlign="center">
            <Pagination
              activePage={activePage}
              boundaryRange={0}
              totalPages={totalPages}
              siblingRange={0}
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
