import React, { useState, useEffect } from 'react';
import ItemTableStatCell from './ItemTableStatCell';
import { TableRow, TableCell, Button, Icon, Modal } from 'semantic-ui-react';
import ItemChartModal from './ItemChartModal';
import ActionButton from './ActionButton';
import firebase from '../firebase';
import { formatTimestampShort } from '../utilities/format';
import PriceTable from './PriceTable';
import { duration } from 'moment';
import styles from './ItemTableCell.styl';
import { NonEmptySnapshot } from '../firebase/snapshot';
import { Item } from 'mercurius-core/lib/models/Item';
import { Link } from 'react-router-dom';
import { FieldDefinition } from 'mercurius-core/lib/models-next/FieldDefinition';

export default function ItemTableRow({
  item,
  fields,
}: {
  item: NonEmptySnapshot<Item>;
  fields: FieldDefinition[];
}): JSX.Element {
  const {
    name,
    priceStats,
    backgroundChartUpdatedAt,
    chartUpdatedAt,
  } = item.data;
  const itemRef = item.ref;

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
      .then(setChartUrl);
  }, [itemRef, backgroundChartUpdatedAt]);

  const cells = fields.map(
    (field): JSX.Element => (
      <ItemTableStatCell key={field.id} item={item.data} field={field} />
    ),
  );

  const chartModal = priceStats && chartUpdatedAt && (
    <ItemChartModal
      itemRef={itemRef}
      item={item.data}
      open={chartModalOpen}
      onClose={(): void => setChartModalOpen(false)}
    />
  );

  const updatedAt =
    item.data.updatedAt && formatTimestampShort(item.data.updatedAt.getTime());

  const backgroundLeft =
    item.data.updatedAt &&
    ((Date.now() - item.data.updatedAt.getTime()) /
      duration(14, 'days').asMilliseconds()) *
      100;

  const rowStyle = {
    backgroundImage: chartUrl ? `url(${chartUrl})` : null,
    backgroundSize: '100% 100%',
    backgroundOrigin: 'content-box',
    backgroundRepeat: 'no-repeat',
    paddingLeft: backgroundLeft && `${backgroundLeft}%`,
    imageRendering: '-webkit-optimize-contrast',
  };

  return (
    <TableRow style={rowStyle}>
      <TableCell className={styles.ItemTableCell}>{name}</TableCell>
      {cells}
      <TableCell className={styles.ItemTableCell}>{updatedAt}</TableCell>
      <TableCell textAlign="center">
        <Button.Group>
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
          <Button
            icon
            as={Link}
            to={`/projects/${itemRef.parent.parent?.id}/items/${itemRef.id}`}
          >
            <Icon name="envelope open" size="small" />
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
        </Button.Group>
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
