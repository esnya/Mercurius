import React from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { assert, assertDefined } from '../utilities/assert';
import { Segment, Container } from 'semantic-ui-react';
import _ from 'lodash';
import {
  ItemAggregation,
  SortOrder,
} from 'mercurius-core/lib/models/ItemAggregation';
import ItemAggregationSchema from 'mercurius-core/src/models/ItemAggregation.schema.yml';
import createDB from '../rxdb/db';
import { from } from 'rxjs';
import { flatMap, tap } from 'rxjs/operators';
import useObservable from '../hooks/useObservable';
import { isDefined } from '../utilities/types';
import fields from '../definitions/fields';

export default function Items(): JSX.Element {
  const { location } = useHistory<{ activePage?: number }>();
  const { projectId } = useParams();
  assertDefined(projectId);

  const activePage = location.state?.activePage ?? 1;
  assert(activePage === undefined || activePage >= 1);

  const itemFilter = useObservable(
    () =>
      from(createDB()).pipe(
        flatMap(db =>
          db.collection<ItemAggregation>({
            name: _.snakeCase(ItemAggregationSchema.title),
            schema: ItemAggregationSchema,
            migrationStrategies: {
              1: () => ({
                projectId,
                fields,
                filters: [],
                sortBy: 'name',
                sortOrder: SortOrder.Ascending,
              }),
            },
          }),
        ),
        flatMap(collection => {
          return collection.findOne({ projectId }).$.pipe(
            tap(doc => {
              if (!isDefined(doc)) {
                return collection.insert({
                  projectId,
                  fields,
                  filters: [],
                  sortBy: 'name',
                  sortOrder: SortOrder.Ascending,
                });
              }
            }),
          );
        }),
      ),
    [projectId],
  );

  console.log(itemFilter);

  return (
    <Container>
      <Segment>
        {projectId}/items/{activePage}
      </Segment>
    </Container>
  );
}
