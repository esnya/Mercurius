import React from 'react';
import PromiseReader from '../suspense/PromiseReader';
import memoize from 'lodash/memoize';
import { firestore } from '../resources/firebase';
import { schemaConverter } from '../firebase/converters';
import Item from 'mercurius-core/lib/models-next/Item';
import ItemSchema from 'mercurius-core/lib/models-next/Item.schema.json';
import { Header, Statistic, Segment } from 'semantic-ui-react';
import {
  formatTimestampShort,
  formatPercent,
  formatZeny,
} from '../utilities/format';
import { isDefined } from '../utilities/types';
import { getDaily, getIndices } from '../utilities/item';
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

  const currentIndices = getIndices(item);
  const today = getDaily(item);

  const fields: [string, JSX.Element | string | number | null | undefined][] = [
    ['価格', today && formatZeny(today.closing.price)],
    [
      '日間騰落率',
      today?.fluctuationRate && formatPercent(today.fluctuationRate * 100),
    ],
    [
      '月間騰落率',
      item.last30Days && formatPercent(item.last30Days.minMaxRate * 100),
    ],
    ['月間最安値', item.last30Days && formatZeny(item.last30Days.min)],
    ['月間最高値', item.last30Days && formatZeny(item.last30Days.max)],
    [
      '売り指数',
      currentIndices && formatPercent(currentIndices.divestment * 100),
    ],
    [
      '買い指数',
      currentIndices && formatPercent(currentIndices.purchase * 100),
    ],
    [
      '更新日時',
      isDefined(item.updatedAt) ? formatTimestampShort(item.updatedAt) : null,
    ],
  ];
  const fieldElements = fields.map(
    ([label, value], i): JSX.Element => (
      <Statistic key={i}>
        <Statistic.Label>{label}</Statistic.Label>
        <Statistic.Value>{value}</Statistic.Value>
      </Statistic>
    ),
  );

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
