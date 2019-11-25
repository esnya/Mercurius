import React from 'react';
import { Confirm, ConfirmProps } from 'semantic-ui-react';

export interface Props extends ConfirmProps {
  action: () => void;
}

interface State {
  open: boolean;
}

export default class ActionWithConfirm extends React.Component<Props, State> {
  state = {
    open: false,
  };

  onAction(): void {
    this.props.action();

    this.setState({
      open: false,
    });
  }

  onCancel(): void {
    this.setState({
      open: false,
    });
  }

  render(): JSX.Element {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { trigger, action, ...otherProps } = this.props;
    const { open } = this.state;

    return (
      <Confirm
        open={open}
        trigger={trigger}
        onConfirm={(): void => this.onAction()}
        onCancel={(): void => this.onCancel()}
        {...otherProps}
      />
    );
  }
}
