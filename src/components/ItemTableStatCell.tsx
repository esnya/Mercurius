import React from 'react';
import PriceStats from '../types/PriceStats';
import { Loader, TableCell, Label } from 'semantic-ui-react';
import { getColorName } from '../utilities/chart';
import StatField from '../types/StatField';

export interface ItemTableStatCellProps {
  stats?: PriceStats;
  field: StatField;
}

export default function ItemTableStatCell({
  stats,
  field: { path, factor, format, colorFactor, textAlign },
}: ItemTableStatCellProps): JSX.Element {
  const value = stats && stats[path];
  const text = stats ? (
    value !== undefined ? (
      format(value * (factor || 1))
    ) : null
  ) : (
    <Loader />
  );
  const child =
    colorFactor && value ? (
      <Label color={getColorName(value * colorFactor)}>{text}</Label>
    ) : (
      text
    );
  return <TableCell textAlign={textAlign || 'right'}>{child}</TableCell>;
}
