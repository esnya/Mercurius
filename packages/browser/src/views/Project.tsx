import React, { useState, useEffect, Suspense } from 'react';
import _ from 'lodash';
import { Container, Segment, Form, Placeholder } from 'semantic-ui-react';
import ItemTable from '../components/ItemTable';
import { useParams } from 'react-router';
import { isDefined } from '../utilities/types';
import ItemFilterControl, { ItemFilter } from '../components/ItemFilterControl';
import fieldDefinitions, { getField } from '../definitions/fields';
import filterDefinitions, { getFilter } from '../definitions/filters';
import usePersistentState from '../hooks/usePersistentState';
import { assertDefined } from '../utilities/assert';
import { getItemFilters } from '../rxdb/collections';
import { Observable } from 'rxjs';
import PromiseReader from '../suspense/PromiseReader';

type Initializer<T> = T | (() => T);

function useObservableAsReader<T>(
  observable: Initializer<Observable<T>>,
  dependsOn?: unknown[],
): { read: () => T } {
  const [value, set] = useState<T>();

  const get = typeof observable === 'function' ? observable : () => observable;

  useEffect((): (() => void) => {
    const s = get().subscribe(set);
    return (): void => s.unsubscribe();
  }, dependsOn);

  return {
    read: (): T => {
      if (value === undefined) throw get().toPromise();
      return value;
    },
  };
}

function asReader<T, A extends unknown[]>(
  func: (...args: A) => Promise<T>,
): (...args: A) => PromiseReader<T> {
  return _.memoize((...args: A) => new PromiseReader(() => func(...args)));
}

const getItemFilter = asReader(
  _.memoize(async (projectId: string) => {
    const collection = await getItemFilters();

    const query = await collection.findOne({ id: projectId });

    if (!(await query.exec())) {
      await collection.insert({
        id: projectId,
        itemsPerPage: 50,
      });
    }

    return query;
  }),
);

function FilterPanel({ projectId }: { projectId: string }): JSX.Element {
  const itemFilter = useObservableAsReader(
    () => getItemFilter(projectId).read().$,
    [projectId],
  ).read();

  return (
    <Form>
      <Form.Select
        allowAdditions
        label="キーワード"
        loading={!itemFilter}
        multiple
        name="keywords"
        options={[]}
        search
        value={itemFilter?.keywords ?? []}
        onChange={(_e, { value }): void => {
          const keywords = value as string[] | undefined;
          itemFilter?.atomicSet(
            'keywords',
            keywords && keywords.length > 0 ? keywords : undefined,
          );
        }}
      />
    </Form>
  );
}

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

  return (
    <Container>
      <Segment>
        <Suspense
          fallback={
            <Placeholder>
              <Placeholder.Line />
            </Placeholder>
          }
        >
          <FilterPanel projectId={projectId} />
        </Suspense>
      </Segment>
      <Segment>
        <ItemFilterControl
          projectId={projectId}
          itemFilter={itemFilter}
          onChange={setItemFilter}
        />
      </Segment>
      <ItemTable projectId={projectId} fields={fields} filters={filters} />
    </Container>
  );
}
