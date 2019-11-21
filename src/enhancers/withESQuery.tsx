import React from 'react';
import { Placeholder, PlaceholderLine } from 'semantic-ui-react';
import { search, Result, SearchBody } from '../elasticsearch';

export interface QueryProps {
  index: string;
  body: SearchBody;
  watch?: number;
}

interface State<T> {
  result?: Result<T>;
}

export interface Props<T> {
  result: Result<T>;
  update: () => Promise<void>;
}

export function withESQueryProps<T = {}>(
  Component: React.ComponentType<Props<T>>,
): React.ComponentClass<QueryProps> {
  return class WithESQuery extends React.Component<QueryProps, State<T>> {
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

      search<T>(index, body).then(result => this.setState({ result }));
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

      return (
        <Component
          result={result}
          update={(): Promise<void> => this.update()}
        />
      );
    }
  };
}

export function withESQuery<T = {}>(
  props: QueryProps,
): (Component: React.ComponentType<Props<T>>) => React.ComponentType {
  return (Component: React.ComponentType<Props<T>>) => (): JSX.Element => {
    const WrappedComponent = withESQueryProps(Component);
    return <WrappedComponent {...props} />;
  };
}
