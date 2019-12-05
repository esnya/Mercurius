import React from 'react';
import StatField from '../types/StatField';
import { TableHeaderCell, TableHeader, TableRow } from 'semantic-ui-react';
import PriceStats from '../types/PriceStats';

export interface ItemTableHeaderProps {
  statFields: StatField[];
  sortBy: keyof PriceStats | 'name';
  sortOrder: 'ascending' | 'descending';
  onSortChange: (path: keyof PriceStats | 'name') => void;
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
        <TableHeaderCell></TableHeaderCell>
      </TableRow>
    </TableHeader>
  );
}
