import React, { useState, useEffect } from 'react';
import {
  Button,
  Table,
  TableCellProps,
  Icon,
  Grid,
  Label,
} from 'semantic-ui-react';
import { QueryDocumentSnapshot, FieldValue } from '../firebase';
import {
  formatTimestampShort,
  formatInteger,
  formatPercent,
} from '../utilities/format';
import { duration } from 'moment';
import styles from './ItemTableCell.styl';
import Item from 'mercurius-core/lib/models-next/Item';
import copy from 'copy-text-to-clipboard';
import ActionButton from './ActionButton';
import { isDefined } from '../utilities/types';
import { DateTime } from 'luxon';
import {
  SemanticICONS,
  SemanticCOLORS,
} from 'semantic-ui-react/dist/commonjs/generic';
import { timestampGetters } from '../utilities/path';
import { Link } from 'react-router-dom';
import ItemChartModal from './ItemChartModal';

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

const icons: SemanticICONS[] = [
  'angle double down',
  'angle down',

  'minus',
  // 'arrow right',

  'angle up',
  'angle double up',
];
const colors: SemanticCOLORS[] = [
  'red',
  'orange',
  'yellow',
  'olive',

  'green',

  'teal',
  'blue',
  'violet',
  'purple',
];

function getByRate<T>(items: T[], rate: number): T {
  const center = Math.floor(items.length / 2);

  if (Math.abs(rate) < 0.1) return items[center];

  const i =
    Math.round((center - 1) * Math.min(Math.abs(rate), 1) + 1) *
    Math.sign(rate);

  return items[center + i];
}

// function RateIcon({ rate }: { rate: number }): JSX.Element {
//   return <Icon name={getByRate(icons, rate)} color={getByRate(colors, rate)} />;
// }

function RateLabel({
  rate,
  textFactor,
  colorFactor,
}: {
  rate?: number;
  textFactor?: number;
  colorFactor?: number;
}): JSX.Element {
  if (rate === undefined) {
    return (
      <Label color="grey">
        <Icon name="question" />
      </Label>
    );
  }

  const colorRate = rate * (colorFactor ?? 1);

  return (
    <Label color={getByRate(colors, colorRate)}>
      <Icon name={getByRate(icons, colorRate)} />
      {formatPercent(rate * 100 * (textFactor ?? 1))}
    </Label>
  );
}

export default React.memo(function ItemTableRow({
  itemSnapshot,
}: {
  itemSnapshot: QueryDocumentSnapshot<Item>;
}): JSX.Element {
  const now = DateTime.local();

  const {
    name,
    last30Days,
    indices,
    daily,
    backgroundChartUpdatedAt,
    updatedAt,
    chartUpdatedAt,
  } = itemSnapshot.data();

  const currentIndices =
    indices && indices[`${timestampGetters.nextTimeUnit(now).valueOf()}`];
  const today =
    daily &&
    (daily[`${timestampGetters.today(now).valueOf()}`] ||
      daily[`${timestampGetters.yesterday(now).valueOf()}`]);

  const [chartUrl, setChartUrl] = useState<string>();
  const [chartModalOpen, setChartModalOpen] = useState(false);

  const itemPath = itemSnapshot.ref.path;
  const storage = itemSnapshot.ref.firestore.app.storage();
  useEffect(() => {
    if (!backgroundChartUpdatedAt) return;
    storage
      .ref(itemPath)
      .child('backgroundChart')
      .getDownloadURL()
      .then(setChartUrl);
  }, [itemPath, backgroundChartUpdatedAt]);

  const chartModal = chartUpdatedAt && (
    <ItemChartModal
      itemSnapshot={itemSnapshot}
      open={chartModalOpen}
      onClose={(): void => setChartModalOpen(false)}
    />
  );

  const backgroundLeft =
    updatedAt &&
    ((Date.now() - updatedAt) / duration(14, 'days').asMilliseconds()) * 100;

  const rowStyle = {
    backgroundImage: chartUrl ? `url(${chartUrl})` : null,
    backgroundSize: '100% 100%',
    backgroundOrigin: 'content-box',
    backgroundRepeat: 'no-repeat',
    paddingLeft: backgroundLeft && `${backgroundLeft}%`,
    imageRendering: '-webkit-optimize-contrast',
  };

  const fluctuationRate = today?.fluctuationRate;

  return (
    <Table.Row style={rowStyle}>
      <Table.Cell textAlign="center">
        <Link
          to={`${itemSnapshot.ref.parent.parent?.id}/items/${itemSnapshot.ref.id}`}
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
          <Grid stackable verticalAlign="middle">
            <Grid.Column width={10}>
              <RateLabel rate={last30Days.minMaxRate} colorFactor={0.1} />
            </Grid.Column>
            <Grid.Column
              width={6}
              className={styles.ItemTableCell}
              textAlign="right"
            >
              {formatInteger(last30Days.min)}
              <br />
              {formatInteger(last30Days.max)}
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
            icon="chart line"
            onClick={(): void => setChartModalOpen(true)}
          />
        </Button.Group>
        {chartModal}
      </Table.Cell>
    </Table.Row>
  );
});
