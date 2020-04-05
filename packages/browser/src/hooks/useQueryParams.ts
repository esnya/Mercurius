import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { parse, stringify } from 'query-string';
import get from 'lodash/get';
import set from 'lodash/set';

export default function useQueryParams<T>(
  init: T | (() => T),
  path: string,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(
    () =>
      get(
        parse(location.search),
        path,
        typeof init === 'function' ? (init as () => T)() : init,
      ) as T,
  );

  useEffect(() => {
    location.search = stringify(set(parse(location.search), path, value));
  }, [value]);

  return [value, setValue];
}
