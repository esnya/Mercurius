import React from 'react';
import PromiseReader from '../suspense/PromiseReader';
import memoize from 'lodash/memoize';
import { firestore } from '../resources/firebase';
import { schemaConverter } from '../firebase/converters';
import Item from 'mercurius-core/lib/models-next/Item';
import ItemSchema from 'mercurius-core/lib/models-next/Item.schema.json';
import { Header, Segment } from 'semantic-ui-react';
import { formatZeny } from '../utilities/format';
import MinMaxCurrentBar from './MinMaxCurrentBar';

export interface ItemDetailsProps {
  projectId: string;
  itemId: string;
}

const getItem = memoize(
  (projectId: string, itemId: string) =>
    new PromiseReader(() =>
      firestore
        .read()
        .doc(`projects/${projectId}/items/${itemId}`)
        .withConverter(schemaConverter<Item>(ItemSchema))
        .get(),
    ),
);

export default function ItemDetails({
  projectId,
  itemId,
}: ItemDetailsProps): JSX.Element {
  const item = getItem(projectId, itemId)
    .read()
    .data();
  if (!item) throw new Error('Item not found');

  const currentPrice = item.last30Days ? (
    <MinMaxCurrentBar
      min={item.last30Days.min}
      max={item.last30Days.max}
      current={item.last30Days.closing.price}
      format={formatZeny}
    />
  ) : null;

  return (
    <Segment>
      <Header as="h2">{item.name}</Header>
      {currentPrice}
    </Segment>
  );
}
