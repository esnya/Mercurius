import shortid from 'shortid';
import _ from 'lodash';

function loadPermanentCache<T>(storage: Storage, key: string): T | undefined {
  const data = storage.getItem(key);
  if (!data) return;

  try {
    return JSON.parse(data) as T;
  } catch {
    return;
  }
}

function savePermanentCache<T>(
  storage: Storage,
  key: string,
  cache: Map<string, CacheValue<T>>,
): void {
  const data: Record<string, CacheValue<T>> = {};
  for (const [key, value] of cache) {
    data[key] = value;
  }
  storage.setItem(key, JSON.stringify(data));
}

function defaultHash<A extends any[]>(...args: A): string {
  return args.map(arg => `${typeof arg}/${arg}`).join(':');
}

interface CacheValue<T> {
  timestamp: number;
  value: T;
}

export default function cached<A extends any[], R>(
  f: (...args: A) => R,
  hash: (...args: A) => string = defaultHash,
  ttl?: number,
  wait = 1000,
  storage: Storage = localStorage,
): (...args: A) => R {
  const cache = new Map<string, CacheValue<R>>();

  const permanentCacheKey = `${f.name}-${f.length}-${hash.name}-${hash.length}`;
  const permanentCache = loadPermanentCache<Record<string, CacheValue<R>>>(
    storage,
    permanentCacheKey,
  );
  if (permanentCache) {
    _(permanentCache).forEach((value, key) => {
      cache.set(key, value);
    });
  }

  const save = _.throttle(
    () => savePermanentCache(storage, permanentCacheKey, cache),
    wait,
  );

  return (...args: A): R => {
    const key = hash(...args);
    const cached = cache.get(key);

    if (cached && (!ttl || Date.now() - cached.timestamp < ttl)) {
      return cached.value;
    }

    const value = f(...args);
    cache.set(key, { timestamp: Date.now(), value });
    save();

    return value;
  };
}
