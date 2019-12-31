import { useEffect, useState, SetStateAction, Dispatch } from 'react';
import { isDefined } from '../utilities/types';
import debounce from 'lodash/debounce';

export default function usePersistentState<S>(
  key: string,
  initialState?: S,
): [S, Dispatch<SetStateAction<S>>] {
  const [state, dispatch] = useState<S>(
    (): S => {
      try {
        const json = localStorage.getItem(key);
        const parsed = json && JSON.parse(json);
        return isDefined(parsed) ? parsed : initialState;
      } catch (e) {
        console.error(e);
        return initialState as S;
      }
    },
  );

  const save = debounce((value: S): void => {
    localStorage.setItem(key, JSON.stringify(value));
  }, 1000);

  useEffect(() => {
    save(state);
  }, [state]);

  return [state, dispatch];
}
