import React from 'react';
import { ButtonProps, Message, Button } from 'semantic-ui-react';

export interface ActionButtonProps extends ButtonProps {
  action: () => Promise<void>;
}

interface State {
  acting: boolean;
  error: string | null;
}

export default class ActionButton extends React.Component<
  ActionButtonProps,
  State
> {
  constructor(props: ActionButtonProps) {
    super(props);

    this.state = {
      acting: false,
      error: null,
    };
  }

  render(): JSX.Element {
    const { action, children, ...props } = this.props;

    const { acting, error } = this.state;

    const errorMessage = error ? <Message negative>{error}</Message> : null;

    const onClick = async (): Promise<void> => {
      try {
        await new Promise(resolve =>
          this.setState(
            {
              acting: true,
              error: null,
            },
            resolve,
          ),
        );
        await action();
        this.setState({
          acting: false,
          error: null,
        });
      } catch (error) {
        this.setState({
          acting: false,
          error: error.toString(),
        });
      }
    };

    return (
      <span>
        <Button disabled={acting} loading={acting} {...props} onClick={onClick}>
          {children}
        </Button>
        {errorMessage}
      </span>
    );
  }
}
