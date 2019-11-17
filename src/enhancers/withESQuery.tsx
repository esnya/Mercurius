import React from 'react';
import { search, Result } from '../elasticsearch';

export type Query = Record<string, any>;

export interface QueryProps {
  index: string;
  body: Record<string, any>;
}

interface State {
  result?: Result;
}

export interface Props {
  result: Result;
}

export function withESQueryProps(
  Component: React.ComponentType<Props>,
): React.ComponentClass<QueryProps> {
  return class WithESQuery extends React.Component<QueryProps, State> {
    constructor(props: QueryProps) {
      super(props);

      this.state = {};

      this.execute();
    }

    private async execute(): Promise<void> {
      const { index, body } = this.props;

      search(index, body).then(result => this.setState({ result }));
    }

    render(): JSX.Element | null {
      const { result } = this.state;
      if (!result) return null;

      return <Component result={result} />;
    }
  };
}

export function withESQuery<T = {}>(
  props: QueryProps,
): (Component: React.ComponentType<Props>) => React.ComponentType {
  return (Component: React.ComponentType<Props>) => (): JSX.Element => {
    const WrappedComponent = withESQueryProps(Component);
    return <WrappedComponent {...props} />;
  };
}
