import React from 'react';
import StatField from '../types/StatField';
import ItemTableRow from './ItemTableRow';
import ItemTableHeader, { ItemTableHeaderProps } from './ItemTableHeader';
import { Table, TableBody } from 'semantic-ui-react';
import Item, { isItem } from '../types/Item';
import firebase from '../firebase';

export interface TableItem {
  itemRef: firebase.firestore.DocumentReference;
  item: Item;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isTableItem(value: any): value is TableItem {
  return (
    typeof value === 'object' &&
    value.itemRef instanceof firebase.firestore.DocumentReference &&
    isItem(value.item)
  );
}

export interface ItemTableProps extends ItemTableHeaderProps {
  items: TableItem[];
  statFields: StatField[];
}

export default function ItemTable({
  items,
  statFields,
  ...others
}: ItemTableProps): JSX.Element {
  const rows = items.map(
    ({ itemRef, item }): JSX.Element => {
      return (
        <ItemTableRow
          key={itemRef.id}
          itemRef={itemRef}
          item={item}
          statFields={statFields}
        />
      );
    },
  );
  return (
    <Table sortable>
      <ItemTableHeader statFields={statFields} {...others} />
      <TableBody>{rows}</TableBody>
    </Table>
  );
}
