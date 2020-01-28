import React from 'react';
import { Container, Segment } from 'semantic-ui-react';
import ItemTable from '../components/ItemTable';
import { useParams } from 'react-router';
import { isDefined } from '../utilities/types';
import ItemFilterControl, { ItemFilter } from '../components/ItemFilterControl';
import fieldDefinitions from '../definitions/fields';
import filterDefinitions, { getFilter } from '../definitions/filters';
import usePersistentState from '../hooks/usePersistentState';
import { assertDefined } from '../utilities/assert';

export default function ProjectHome(): JSX.Element {
  const { projectId } = useParams();
  assertDefined(projectId);

  const [itemFilter, setItemFilter] = usePersistentState<ItemFilter>(
    'itemFilter',
    {
      filterId: filterDefinitions[0].id,
      itemsPerPage: 50,
      fieldIds: fieldDefinitions.map(({ id }) => id),
    },
  );
  const { fieldIds, filterId, search } = itemFilter;

  const fields = fieldIds
    .map(id => fieldDefinitions.find(f => f.id === id))
    .filter(isDefined);

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

  return (
    <Container>
      <Segment>
        <ItemFilterControl
          projectId={projectId}
          itemFilter={itemFilter}
          onChange={setItemFilter}
        />
      </Segment>
      <div style={{ overflow: 'auto' }}>
        <ItemTable projectId={projectId} fields={fields} filters={filters} />
      </div>
    </Container>
  );
}
