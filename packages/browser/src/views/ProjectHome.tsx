import React from 'react';
import { Container, Segment } from 'semantic-ui-react';
import ItemTable from '../components/ItemTable';
import { useParams } from 'react-router';
import { isDefined } from '../utilities/types';
import ItemFilterControl, { ItemFilter } from '../components/ItemFilterControl';
import fieldDefinitions, { getField } from '../definitions/fields';
import filterDefinitions, { getFilter } from '../definitions/filters';
import usePersistentState from '../hooks/usePersistentState';
import NotFound from './NotFound';

export default function ProjectHome(): JSX.Element {
  const { projectId } = useParams();

  const [itemFilter, setItemFilter] = usePersistentState<ItemFilter>(
    'itemFilter',
    {
      filterId: filterDefinitions[0].id,
      itemsPerPage: 50,
      fieldIds: fieldDefinitions.map(({ id }) => id),
    },
  );
  const { fieldIds, filterId, search } = itemFilter;

  const fields = fieldIds.map(getField).filter(isDefined);

  const searchQueries =
    search &&
    search
      .split(/\s+/g)
      .filter(a => a.length > 0)
      .map(keyword => ({ 'data.name': { $regex: keyword } }));
  const filters = [
    getFilter(filterId || 'all').query,
    searchQueries && searchQueries.length > 0
      ? {
          $or: searchQueries,
        }
      : undefined,
  ].filter(isDefined);

  if (!projectId) {
    return <NotFound />;
  }

  return (
    <Container>
      <Segment>
        <ItemFilterControl
          projectId={projectId || ''}
          itemFilter={itemFilter}
          onChange={setItemFilter}
        />
      </Segment>
      <ItemTable projectId={projectId} fields={fields} filters={filters} />
    </Container>
  );
}
