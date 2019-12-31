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
import { Item } from 'mercurius-core/lib/models/Item';
import ItemTable from '../components/ItemTable';
import { useParams } from 'react-router';
import { useDocumentSnapshot, useQuerySnapshot } from '../hooks/useSnapshot';
import { isFailed, isDefined } from '../utilities/types';
import ItemFilterControl, { ItemFilter } from '../components/ItemFilterControl';
import fieldDefinitions, { getField } from '../definitions/fields';
import filterDefinitions, { getFilter } from '../definitions/filters';
import usePersistentState from '../hooks/usePersistentState';

export default function ProjectHome(): JSX.Element {
  const { projectId } = useParams();

  const project = useDocumentSnapshot(
    (firestore, projectId) => firestore.collection('projects').doc(projectId),
    (data): { name: string; owner: string } | null =>
      data as { name: string; owner: string },
    projectId,
  );

  const items = useQuerySnapshot(
    (firestore, projectId) =>
      firestore
        .collection('projects')
        .doc(projectId)
        .collection('items'),
    Item.cast,
    projectId,
  );
  const [itemFilter, setItemFilter] = usePersistentState<ItemFilter>(
    'itemFilter',
    {
      filterId: filterDefinitions[0].id,
      itemsPerPage: 50,
      fieldIds: fieldDefinitions.map(({ id }) => id),
    },
  );
  const { fieldIds, filterId, search } = itemFilter;

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

  const fields = fieldIds.map(getField).filter(isDefined);

  const filters = [
    getFilter(filterId || 'all').query,
    search && {
      $or: search
        .split(/\s+/g)
        .filter(a => a.length > 0)
        .map(keyword => ({ 'data.name': { $regex: keyword } })),
    },
  ].filter(isDefined);

  return (
    <Container>
      <Segment>
        <ItemFilterControl
          projectId={projectId || ''}
          itemFilter={itemFilter}
          onChange={setItemFilter}
        />
      </Segment>
      <ItemTable items={items} fields={fields} filters={filters} />
    </Container>
  );
}
