import React from 'react';
import PriceStats from '../types/PriceStats';
import { Loader, TableCell, Label } from 'semantic-ui-react';
import { getColorName } from '../utilities/chart';
import StatField from '../types/StatField';
import styles from './ItemTableCell.styl';
import _ from 'lodash';
import Item from '../types/Item';

export interface ItemTableStatCellProps {
  item: Item;
  field: StatField;
}

export default function ItemTableStatCell({
  item,
  field: { path, factor, format, colorFactor, colorBias, textAlign },
}: ItemTableStatCellProps): JSX.Element {
  const value = _.get(item, path);
  const text = value !== undefined ? format(value * (factor || 1)) : null;
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
