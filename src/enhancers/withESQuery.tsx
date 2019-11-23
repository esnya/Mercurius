import React from 'react';
import { search, Result, SearchBody } from '../elasticsearch';
import { ChildProps as PromiseChildProps, waitPromise } from './waitPromise';

export interface QueryProps {
  index: string;
  body: SearchBody;
  watch?: number;
}

export type ChildProps = PromiseChildProps<Result<{}>>;

export function withESQuery(
  index: string,
  body: SearchBody,
  watch?: number,
): (Component: React.ComponentType<ChildProps>) => React.ComponentType {
  return waitPromise((): Promise<Result<{}>> => search(index, body), watch);
}
