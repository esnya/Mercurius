import React from 'react';
import {
  Message,
  Placeholder,
  PlaceholderLine,
  Container,
} from 'semantic-ui-react';

interface State<T> {
  value?: T;
  loading: boolean;
  error?: string;
}

export interface ChildProps<T> {
  value: T;
  update: () => Promise<void>;
}

export function waitPromise<T, Props = {}>(
  promise: Promise<T> | (() => Promise<T>),
  watch?: number,
): (
  Component: React.ComponentType<ChildProps<T> & Props>,
) => React.ComponentClass<Props> {
  return (
    Component: React.ComponentType<ChildProps<T> & Props>,
  ): React.ComponentClass<Props> =>
    class WaitPromise extends React.Component<Props, State<T>> {
      constructor(props: Props) {
        super(props);

        this.state = {
          loading: true,
        };
      }

      private interval?: ReturnType<typeof setInterval>;

      reset(): void {
        this.setState({ error: undefined });
      }

      set(result: { error?: string; value?: T }): void {
        this.setState({
          ...result,
          loading: false,
        });
      }

      async update(): Promise<void> {
        try {
          this.reset();
          const value = await (promise instanceof Promise
            ? promise
            : promise());
          this.set({ value });
        } catch (error) {
          this.set({ error: error.toString() });
        }
      }

      render(): JSX.Element {
        const { loading, value, error } = this.state;

        if (loading) {
          return (
            <Container>
              <Placeholder>
                <PlaceholderLine />
                <PlaceholderLine />
                <PlaceholderLine />
                <PlaceholderLine />
                <PlaceholderLine />
              </Placeholder>
            </Container>
          );
        }

        if (error || value === undefined) {
          return <Message error header={error || 'Unknown error.'} />;
        }

        return (
          <Component
            {...this.props}
            value={value}
            update={(): Promise<void> => this.update()}
          />
        );
      }

      async componentDidMount(): Promise<void> {
        await this.update();
        if (watch) this.interval = setInterval(() => this.update(), watch);
      }

      componentWillUnmount(): void {
        if (this.interval) clearInterval(this.interval);
      }
    };
}
