import React from 'react';
import { DocumentReference } from '../firebase';
import { Snapshot, isExists, cast } from '../firebase/snapshot';
import { Item, ItemConverter } from 'mercurius-core/lib/models/Item';
import useAsyncSimple from '../hooks/useAsyncSimple';
import { isSucceeded, isFailed } from '../utilities/types';
import { Message, Placeholder, List } from 'semantic-ui-react';
import NotFound from '../views/NotFound';
import PriceStatsView from './PriceStatsView';

export interface ItemViewProps {
  itemRef: DocumentReference;
}

export default function ItemView({ itemRef }: ItemViewProps): JSX.Element {
  const itemSnapshot = useAsyncSimple(async (): Promise<Snapshot<Item>> => {
    return cast(await itemRef.get(), ItemConverter.cast);
  }, [itemRef.path]);

  if (isFailed(itemSnapshot)) {
    return (
      <Message negative>
        <Message.Content>{itemSnapshot.toString()}</Message.Content>
      </Message>
    );
  }

  if (!isSucceeded(itemSnapshot)) {
    return <Placeholder.Paragraph />;
  }

  if (!isExists(itemSnapshot)) {
    return <NotFound />;
  }

  const item = itemSnapshot.data;

  const priceStatsView = item.priceStats && (
    <PriceStatsView priceStats={item.priceStats} />
  );

  return (
    <List divided>
      <List.Item>
        <List.Description>アイテム名</List.Description>
        {item.name}
      </List.Item>
      <List.Item>
        <List.Description>種別</List.Description>
        {item.type ?? ''}
      </List.Item>
      <List.Item>{priceStatsView}</List.Item>
    </List>
  );
}
