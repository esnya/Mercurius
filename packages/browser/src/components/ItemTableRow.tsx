import React, { useState, CSSProperties } from 'react';
import { Button, Table, TableCellProps, Grid } from 'semantic-ui-react';
import { QueryDocumentSnapshot, FieldValue } from '../firebase';
import { formatTimestampShort, formatInteger } from '../utilities/format';
import styles from './ItemTableCell.styl';
import Item from 'mercurius-core/lib/models-next/Item';
import copy from 'copy-text-to-clipboard';
import ActionButton from './ActionButton';
import { isDefined } from '../utilities/types';
import { Link } from 'react-router-dom';
import ItemChartModal from './ItemChartModal';
import RateLabel from './RateLabel';
import { getIndices, getDaily } from '../utilities/item';

function Cell({
  children,
  textAlign,
  className,
  ...props
}: TableCellProps): JSX.Element {
  return (
    <Table.Cell
      {...props}
      className={`${styles.ItemTableCell} ${className}`}
      textAlign={textAlign ?? 'right'}
    >
      {children}
    </Table.Cell>
  );
}

export default React.memo(function ItemTableRow({
  itemSnapshot,
}: {
  itemSnapshot: QueryDocumentSnapshot<Item>;
}): JSX.Element {
  const item = itemSnapshot.data();
  const { name, last30Days, updatedAt, chartUrl, backgroundChartUrl } = item;

  const currentIndices = getIndices(item);
  const today = getDaily(item);

  const [chartModalOpen, setChartModalOpen] = useState(false);

  const chartModal = chartUrl && (
    <ItemChartModal
      itemSnapshot={itemSnapshot}
      open={chartModalOpen}
      onClose={(): void => setChartModalOpen(false)}
    />
  );

  // const backgroundLeft =
  //   updatedAt &&
  //   ((Date.now() - updatedAt) / duration(14, 'days').asMilliseconds()) * 100;

  const rowStyle: CSSProperties = {
    backgroundImage: chartUrl ? `url(${backgroundChartUrl})` : undefined,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    imageRendering: '-webkit-optimize-contrast',
  };

  const fluctuationRate = today?.fluctuationRate;

  return (
    <Table.Row style={rowStyle}>
      <Table.Cell textAlign="center" verticalAlign="middle">
        <Link
          to={`/projects/${itemSnapshot.ref.parent.parent?.id}/items/${itemSnapshot.ref.id}`}
        >
          {name}
        </Link>
        <Button
          floated="right"
          icon="copy"
          onClick={(): void => {
            copy(name.replace(/\[.*$/, ''));
          }}
        />
      </Table.Cell>
      <Cell>
        {isDefined(last30Days) ? formatInteger(last30Days.closing.price) : null}
      </Cell>
      <Cell>
        <RateLabel rate={fluctuationRate} colorFactor={2} />
      </Cell>
      <Cell>
        {isDefined(last30Days) ? (
          <Grid verticalAlign="middle" centered columns="equal">
            <Grid.Column textAlign="right">
              {formatInteger(last30Days.min)}
              <br />
              {formatInteger(last30Days.max)}
            </Grid.Column>
            <Grid.Column>
              <RateLabel rate={last30Days.minMaxRate} colorFactor={0.1} />
            </Grid.Column>
          </Grid>
        ) : (
          <RateLabel />
        )}
      </Cell>
      <Cell>
        <RateLabel rate={currentIndices?.purchase} />
      </Cell>
      <Cell>
        <RateLabel rate={currentIndices?.divestment} />
      </Cell>
      <Cell>{formatTimestampShort(updatedAt)}</Cell>
      <Table.Cell textAlign="center">
        <Button.Group>
          <ActionButton
            color="red"
            icon="sync"
            action={(): Promise<void> =>
              itemSnapshot.ref.update({ updatedAt: FieldValue.delete() })
            }
          />
          <Button
            color="blue"
            disabled={!chartUrl}
            icon="chart line"
            onClick={(): void => setChartModalOpen(true)}
          />
        </Button.Group>
        {chartModal}
      </Table.Cell>
    </Table.Row>
  );
});
