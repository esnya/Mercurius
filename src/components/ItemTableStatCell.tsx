import React from 'react';
import { TableCell, Label, Icon } from 'semantic-ui-react';
import { getColorName } from '../utilities/chart';
import StatField from '../types/StatField';
import styles from './ItemTableCell.styl';
import _ from 'lodash';
import Item from '../types/Item';
import { SemanticICONS } from 'semantic-ui-react/dist/commonjs/generic';

export interface ItemTableStatCellProps {
  item: Item;
  field: StatField;
}

function getIconName(value: number): SemanticICONS {
  if (value < -0.1) return 'angle double down';
  if (value < -0.01) return 'angle down';

  if (value > 0.1) return 'angle double up';
  if (value > 0.01) return 'angle up';

  return 'minus';
}

export default function ItemTableStatCell({
  item,
  field: { path, factor, format, textAlign, color },
}: ItemTableStatCellProps): JSX.Element {
  const value = _.get(item, path);
  const text = value !== undefined ? format(value * (factor || 1)) : null;
  const colorFactor = color && (color.factor || 0);
  const colorMinus = (color && color.minus) || false;

  const colorValue =
    colorFactor &&
    (value * colorFactor + (colorMinus ? 1 : 0)) * (colorMinus ? 0.5 : 1);
  const child =
    colorValue !== undefined ? (
      <Label color={getColorName(colorValue)} style={{ whiteSpace: 'nowrap' }}>
        {color && color.minus ? (
          <Icon name={getIconName(colorValue * 2 - 0.5)} />
        ) : (
          undefined
        )}
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
