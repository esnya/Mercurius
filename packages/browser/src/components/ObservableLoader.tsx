import React from 'react';
import { ObservableState } from '../hooks/useObservable';
import { Loader } from 'semantic-ui-react';

export interface ObservableLoaderProps<T, E extends Error> {
  state: ObservableState<T, E>;
  render: (value: T) => JSX.Element | null;
}
export default function ObservableLoader<T, E extends Error = Error>({
  state,
  render,
}: ObservableLoaderProps<T, E>): JSX.Element | null {
  switch (state.state) {
    case 'loading':
      return <Loader active />;
    case 'succeeded':
      return render(state.value);
    case 'failed':
      throw state.error;
  }
}
