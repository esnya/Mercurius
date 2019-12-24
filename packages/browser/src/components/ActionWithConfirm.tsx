import React from 'react';
import { Modal, ModalProps } from 'semantic-ui-react';

export interface Props extends ModalProps {
  action: () => void;
}

export default React.memo(function ActionWithConfirm({
  action,
  ...props
}: Props): JSX.Element {
  return (
    <Modal
      actions={['OK', 'Cancel']}
      onActionClick={(e): void => {
        if (e.currentTarget.textContent === 'OK') {
          action();
        }
      }}
      {...props}
    />
  );
});
