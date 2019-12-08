import React from 'react';
import PriceStats from '../types/PriceStats';
import { Loader, TableCell, Label } from 'semantic-ui-react';
import { getColorName } from '../utilities/chart';
import StatField from '../types/StatField';
import styles from './ItemTableCell.styl';

export interface ItemTableStatCellProps {
  stats?: PriceStats;
  field: StatField;
}

export default function ItemTableStatCell({
  stats,
  field: { path, factor, format, colorFactor, colorBias, textAlign },
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
    colorFactor !== undefined &&
    colorBias !== undefined &&
    value !== undefined ? (
      <Label color={getColorName((value + colorBias) * colorFactor)}>
        {text}
      </Label>
    ) : (
      text
    );
  return (
    <TableCell
      className={styles.ItemTableCell}
      textAlign={textAlign || 'right'}
    >
      {child}
    </TableCell>
  );
}
