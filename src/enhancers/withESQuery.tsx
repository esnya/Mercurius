import React from 'react';
import { Placeholder, PlaceholderLine } from 'semantic-ui-react';
import { search, Result } from '../elasticsearch';

export type Query = Record<string, any>;

export interface QueryProps {
  index: string;
  body: Record<string, any>;
  watch?: number;
}

interface State {
  result?: Result;
}

export interface Props {
  result: Result;
  update: () => Promise<void>;
}

export function withESQueryProps(
  Component: React.ComponentType<Props>,
): React.ComponentClass<QueryProps> {
  return class WithESQuery extends React.Component<QueryProps, State> {
    constructor(props: QueryProps) {
      super(props);

      this.state = {};

      this.update();

      if (props.watch) {
        this.interval = setInterval(() => this.update(), props.watch);
      }
    }

    private interval?: ReturnType<typeof setInterval>;

    private async update(): Promise<void> {
      const { index, body } = this.props;

      search(index, body).then(result => this.setState({ result }));
    }

    componentWillUnmount(): void {
      if (this.interval) clearInterval(this.interval);
    }

    render(): JSX.Element | null {
      const { result } = this.state;
      if (!result)
        return (
          <Placeholder>
            <PlaceholderLine />
            <PlaceholderLine />
            <PlaceholderLine />
            <PlaceholderLine />
            <PlaceholderLine />
          </Placeholder>
        );

      return <Component result={result} update={() => this.update()} />;
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
