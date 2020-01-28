import React from 'react';
import { TableCell, Label, Icon } from 'semantic-ui-react';
import { getColorName } from '../utilities/chart';
import styles from './ItemTableCell.styl';
import _ from 'lodash';
import { SemanticICONS } from 'semantic-ui-react/dist/commonjs/generic';
import { isDefined } from '../utilities/types';
import { Item } from 'mercurius-core/lib/models/Item';
import { FieldDefinition } from 'mercurius-core/lib/models-next/FieldDefinition';
import { formatInteger, formatPercent } from '../utilities/format';

export interface ItemTableStatCellProps {
  item: Item;
  field: FieldDefinition;
}

function getIconName(value: number): SemanticICONS {
  if (value < -0.1) return 'angle double down';
  if (value < -0.01) return 'angle down';

  if (value > 0.1) return 'angle double up';
  if (value > 0.01) return 'angle up';

  return 'minus';
}

function formatNumber(type: string, value: number): string {
  switch (type) {
    case 'integer':
      return formatInteger(value);
    case 'percentage':
      return formatPercent(value);
    default:
      return `${value}`;
  }
}

export default function ItemTableStatCell({
  item,
  field,
}: ItemTableStatCellProps): JSX.Element {
  const { factor, format, textAlign } = {
    factor: 1,
    format: 'none',
    ...field,
  };
  const color = field.color
    ? {
        factor: 1,
        minus: false,
        ...field.color,
      }
    : null;

  const value = _.get(item, field.id);
  const text = isDefined(value)
    ? formatNumber(format, value * factor)
    : undefined;

  const colorValue =
    isDefined(value) && color
      ? (value * color.factor + (color.minus ? 1 : 0)) * (color.minus ? 0.5 : 1)
      : undefined;

  const child = isDefined(colorValue) ? (
    <Label color={getColorName(colorValue)} style={{ whiteSpace: 'nowrap' }}>
      {color && color.minus ? (
        <Icon name={getIconName(value || 0)} />
      ) : (
        undefined
      )}
      {text}
    </Label>
  ) : (
    text
  );

  return (
    <TableCell className={styles.ItemTableCell} textAlign={textAlign}>
      {child}
    </TableCell>
  );
}
