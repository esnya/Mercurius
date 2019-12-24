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
import Item from '../types/Item';

export interface ItemChartModalProps extends ModalProps {
  item: Item;
  itemRef: firebase.firestore.DocumentReference;
}
export default function ItemChartModal({
  itemRef,
  item,
  open,
  onClose,
  ...modalProps
}: ItemChartModalProps): JSX.Element {
  const [chartUrl, setChartUrl] = useState<string>();
  const { chartUpdatedAt } = item;

  useEffect(() => {
    const ref = itemRef.firestore.app
      .storage()
      .ref(itemRef.path)
      .child('chart');
    ref.getDownloadURL().then(setChartUrl);
  }, [itemRef, chartUpdatedAt]);

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
