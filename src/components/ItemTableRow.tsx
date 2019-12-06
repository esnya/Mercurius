import React, { useState, useEffect } from 'react';
import Item from '../types/Item';
import ItemTableStatCell from './ItemTableStatCell';
import { TableRow, TableCell, Button, Icon } from 'semantic-ui-react';
import StatField from '../types/StatField';
import ItemChartModal from './ItemChartModal';
import DiffIcon from './DiffIcon';
import ActionButton from './ActionButton';
import firebase from '../firebase';
import { formatTimestampShort } from '../utilities/format';

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
      onClose={() => setChartModalOpen(false)}
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
          <Icon name="chart bar" />
        </Button>
        <ActionButton
          icon
          action={(): Promise<void> =>
            itemRef.update({
              updatedAt: firebase.firestore.FieldValue.delete(),
            })
          }
        >
          <Icon name="sync" />
        </ActionButton>
        {chartModal}
      </TableCell>
    </TableRow>
  );
}
