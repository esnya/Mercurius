import React from 'react';
import { search, Result, SearchBody } from '../elasticsearch';
import { ChildProps as PromiseChildProps, waitPromise } from './waitPromise';

export interface QueryProps {
  index: string;
  body: SearchBody;
  watch?: number;
}

export type ChildProps<T = {}> = PromiseChildProps<Result<T>>;

export function withESQuery<T = {}>(
  index: string,
  body: SearchBody,
  watch?: number,
): (Component: React.ComponentType<ChildProps<T>>) => React.ComponentType {
  return waitPromise((): Promise<Result<T>> => search(index, body), watch);
}
