import React from 'react';
import StatField from '../types/StatField';
import { TableHeaderCell, TableHeader, TableRow } from 'semantic-ui-react';
import PriceStats from '../types/PriceStats';

export interface ItemTableHeaderProps {
  statFields: StatField[];
  sortBy: keyof PriceStats | 'name' | 'updatedAt';
  sortOrder: 'ascending' | 'descending';
  onSortChange: (path: keyof PriceStats | 'name' | 'updatedAt') => void;
}

export default function ItemTableHeader({
  statFields,
  sortBy,
  sortOrder,
  onSortChange,
}: ItemTableHeaderProps): JSX.Element {
  const headerCells = statFields.map(
    ({ text, path }, i): JSX.Element => (
      <TableHeaderCell
        key={i}
        sorted={path === sortBy ? sortOrder : undefined}
        textAlign="center"
        onClick={(): void => onSortChange(path)}
      >
        {text}
      </TableHeaderCell>
    ),
  );

  return (
    <TableHeader>
      <TableRow>
        <TableHeaderCell />
        <TableHeaderCell
          sorted={sortBy === 'name' ? sortOrder : undefined}
          textAlign="center"
          onClick={(): void => onSortChange('name')}
        >
          アイテム
        </TableHeaderCell>
        {headerCells}
        <TableHeaderCell
          sorted={sortBy === 'updatedAt' ? sortOrder : undefined}
          textAlign="center"
          onClick={(): void => onSortChange('updatedAt')}
        >
          更新日時
        </TableHeaderCell>
        <TableHeaderCell></TableHeaderCell>
      </TableRow>
    </TableHeader>
  );
}
