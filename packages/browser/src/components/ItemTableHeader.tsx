import React from 'react';
import { Table, Input } from 'semantic-ui-react';

export interface ItemTableHeaderProps {
  headers: Partial<{ id: string; text: string }>[];
  sortBy: string;
  sortOrder: 'ascending' | 'descending';
  keywords: string[] | null;
  onSortChange: (id: string) => void;
  onKeywordsChange: (keywords: string[] | null) => void;
}

export default function ItemTableHeader({
  headers,
  sortBy,
  sortOrder,
  keywords,
  onSortChange,
  onKeywordsChange,
}: ItemTableHeaderProps): JSX.Element {
  const headerCells = headers.map(
    ({ id, text }, i): JSX.Element =>
      !id || !text ? (
        <Table.HeaderCell key={i} />
      ) : (
        <Table.HeaderCell
          key={i}
          sorted={id === sortBy ? sortOrder : undefined}
          textAlign="center"
          onClick={(): void => onSortChange(id)}
        >
          {text}
        </Table.HeaderCell>
      ),
  );

  return (
    <Table.Header>
      <Table.Row>
        <Table.HeaderCell colSpan={headerCells.length} textAlign="right">
          <Input
            icon="search"
            name="keywords"
            value={keywords?.join(' ') ?? ''}
            onChange={(_e, { value }): void => {
              const keywords =
                value && typeof value === 'string'
                  ? value.split(/\s+/g).filter(a => a)
                  : null;
              onKeywordsChange(keywords);
            }}
          />
        </Table.HeaderCell>
      </Table.Row>
      <Table.Row>{headerCells}</Table.Row>
    </Table.Header>
  );
}
