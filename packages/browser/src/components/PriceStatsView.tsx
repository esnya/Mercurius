import React from 'react';
import { PriceStats } from 'mercurius-core/lib/models/Item';
import { List } from 'semantic-ui-react';
import { formatPercent, formatInteger } from '../utilities/format';

export default function PriceStatsView({
  priceStats,
}: {
  priceStats: PriceStats;
}): JSX.Element {
  return (
    <List divided>
      <List.Item>
        <List.Description>現価</List.Description>
        {formatInteger(priceStats.end)}
      </List.Item>
      <List.Item>
        <List.Description>最安値</List.Description>
        {formatInteger(priceStats.min)}
      </List.Item>
      <List.Item>
        <List.Description>最高値</List.Description>
        {formatInteger(priceStats.max)}
      </List.Item>
      <List.Item>
        <List.Description>月間騰落率</List.Description>
        {formatPercent(
          ((priceStats.max - priceStats.min) / priceStats.min) * 100,
        )}
      </List.Item>
    </List>
  );
}
