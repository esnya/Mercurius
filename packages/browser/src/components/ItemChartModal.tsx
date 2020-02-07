import React, { useState, useEffect } from 'react';
import {
  ModalProps,
  Modal,
  ModalContent,
  Loader,
  Button,
  ModalActions,
  Image,
  ButtonProps,
} from 'semantic-ui-react';
import { QueryDocumentSnapshot } from '../firebase';
import Item from 'mercurius-core/lib/models-next/Item';

export interface ItemChartModalProps extends ModalProps {
  itemSnapshot: QueryDocumentSnapshot<Item>;
}
export default function ItemChartModal({
  itemSnapshot,
  open,
  onClose,
  ...modalProps
}: ItemChartModalProps): JSX.Element {
  const { chartUrl } = itemSnapshot.data();

  return (
    <Modal open={open} onClose={onClose} {...modalProps}>
      <ModalContent image>
        {chartUrl ? <Image src={chartUrl} /> : <Loader />}
      </ModalContent>
      <ModalActions>
        <Button onClick={onClose as ButtonProps['onClick']}>閉じる</Button>
      </ModalActions>
    </Modal>
  );
}
