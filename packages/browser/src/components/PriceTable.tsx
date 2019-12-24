import React, { useState, useEffect } from 'react';
import { CollectionReference, QuerySnapshot } from '../firebase';
import { Loader, Table, Checkbox, Icon } from 'semantic-ui-react';
import { formatTimestamp, formatZeny } from '../utilities/format';
import ActionButton from './ActionButton';

export default function PriceTable({
  pricesRef,
}: {
  pricesRef: CollectionReference;
}): JSX.Element {
  const [prices, setPrices] = useState<QuerySnapshot>();

  useEffect((): (() => void) =>
    pricesRef.orderBy('timestamp', 'desc').onSnapshot(setPrices),
  );

  const rows = prices ? (
    prices.docs.map(
      (price): JSX.Element => (
        <Table.Row key={price.ref.id}>
          <Table.Cell>{formatTimestamp(price.get('timestamp'))}</Table.Cell>
          <Table.Cell textAlign="right">
            {formatZeny(price.get('price'))}
          </Table.Cell>
          <Table.Cell textAlign="center">
            <Checkbox readOnly checked={price.get('lottery')} />
          </Table.Cell>
          <Table.Cell textAlign="center">
            <ActionButton
              action={(): Promise<void> => price.ref.delete()}
              color="red"
              icon
            >
              <Icon name="delete" size="small" />
            </ActionButton>
          </Table.Cell>
        </Table.Row>
      ),
    )
  ) : (
    <Table.Row>
      <Table.Cell colSpan="4">
        <Loader />
      </Table.Cell>
    </Table.Row>
  );

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>日時</Table.HeaderCell>
          <Table.HeaderCell>価格</Table.HeaderCell>
          <Table.HeaderCell>抽選</Table.HeaderCell>
          <Table.HeaderCell></Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>{rows}</Table.Body>
    </Table>
  );
}
