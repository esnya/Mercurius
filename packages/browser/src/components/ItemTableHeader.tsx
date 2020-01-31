import React from 'react';
import { TableHeaderCell, TableHeader, TableRow } from 'semantic-ui-react';
import FieldDefinition from 'mercurius-core/lib/models-next/FieldDefinition';

export interface ItemTableHeaderProps {
  fields: FieldDefinition[];
  sortBy: string;
  sortOrder: 'ascending' | 'descending';
  onSortChange: (id: string) => void;
}

export default function ItemTableHeader({
  fields,
  sortBy,
  sortOrder,
  onSortChange,
}: ItemTableHeaderProps): JSX.Element {
  const headerCells = fields.map(
    ({ text, id }, i): JSX.Element => (
      <TableHeaderCell
        key={i}
        sorted={id === sortBy ? sortOrder : undefined}
        textAlign="center"
        onClick={(): void => onSortChange(id)}
      >
        {text}
      </TableHeaderCell>
    ),
  );

  return (
    <TableHeader>
      <TableRow>
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
