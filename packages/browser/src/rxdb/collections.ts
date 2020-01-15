import _ from 'lodash';
import memoize from 'lodash/memoize';
import { ItemFilter } from 'mercurius-core/lib/models/ItemFilter';
import ItemFiltersSchema from 'mercurius-core/src/models/ItemFilter.schema.yml';
import createDB from './db';
import { RxCollection } from 'rxdb';

export const getItemFilters = memoize(
  async (): Promise<RxCollection<ItemFilter>> => {
    const db = await createDB();
    return await db.collection({
      name: 'item_filters',
      schema: ItemFiltersSchema,
      migrationStrategies: {
        1: _.partial(_.pick, _, 'id', 'itemsPerPage'),
      },
    });
  },
);
