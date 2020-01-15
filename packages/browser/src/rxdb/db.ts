import RxDB, { RxDatabase } from 'rxdb';
import adapter from 'pouchdb-adapter-idb';
import memoize from 'lodash/memoize';

RxDB.plugin(adapter);

const createDB = memoize(
  async (): Promise<RxDatabase> => {
    return await RxDB.create({
      name: 'mercurius',
      adapter: 'idb',
    });
  },
);
export default createDB;
