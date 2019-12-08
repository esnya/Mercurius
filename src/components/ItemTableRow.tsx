import React, { useState, useEffect } from 'react';
import Item from '../types/Item';
import ItemTableStatCell from './ItemTableStatCell';
import { TableRow, TableCell, Button, Icon, Modal } from 'semantic-ui-react';
import StatField from '../types/StatField';
import ItemChartModal from './ItemChartModal';
import DiffIcon from './DiffIcon';
import ActionButton from './ActionButton';
import firebase from '../firebase';
import { formatTimestampShort } from '../utilities/format';
import PriceTable from './PriceTable';

export default function ItemTableRow({
  item,
  itemRef,
  statFields,
}: {
  item: Item;
  itemRef: firebase.firestore.DocumentReference;
  statFields: StatField[];
}): JSX.Element {
  const { name, priceStats, backgroundChartUpdatedAt, chartUpdatedAt } = item;

  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [chartUrl, setChartUrl] = useState<string>();

  useEffect(() => {
    if (!backgroundChartUpdatedAt) return;
    itemRef.firestore.app
      .storage()
      .ref(itemRef.path)
      .child('backgroundChart')
      .getDownloadURL()
      .then(setChartUrl, () => {});
  }, [itemRef, backgroundChartUpdatedAt]);

  const cells = statFields.map(
    (field, i): JSX.Element => (
      <ItemTableStatCell key={i} stats={priceStats} field={field} />
    ),
  );

  const chartModal = priceStats && chartUpdatedAt && (
    <ItemChartModal
      itemRef={itemRef}
      item={item}
      open={chartModalOpen}
      onClose={(): void => setChartModalOpen(false)}
    />
  );

  const rowStyle = {
    backgroundImage: chartUrl ? `url(${chartUrl})` : null,
    backgroundSize: '100% 100%',
    imageRendering: '-webkit-optimize-contrast',
  };

  const updatedAt =
    item.updatedAt && formatTimestampShort(item.updatedAt.toMillis());

  return (
    <TableRow style={rowStyle}>
      <TableCell textAlign="center">
        <DiffIcon diffRate={(priceStats && priceStats.variationRate) || null} />
      </TableCell>
      <TableCell>{name}</TableCell>
      {cells}
      <TableCell>{updatedAt}</TableCell>
      <TableCell>
        <Button
          icon
          disabled={!chartModal}
          onClick={(): void => setChartModalOpen(true)}
        >
          <Icon name="chart bar" size="small" />
        </Button>
        <Button icon onClick={(): void => setPriceModalOpen(true)}>
          <Icon name="table" size="small" />
        </Button>
        <ActionButton
          icon
          action={(): Promise<void> =>
            itemRef.update({
              updatedAt: firebase.firestore.FieldValue.delete(),
            })
          }
        >
          <Icon name="sync" size="small" />
        </ActionButton>
        {chartModal}
        <Modal
          open={priceModalOpen}
          onClose={(): void => setPriceModalOpen(false)}
        >
          <PriceTable pricesRef={itemRef.collection('prices')} />
          <Modal.Actions>
            <Button color="blue" onClick={(): void => setPriceModalOpen(false)}>
              閉じる
            </Button>
          </Modal.Actions>
        </Modal>
      </TableCell>
    </TableRow>
  );
}
