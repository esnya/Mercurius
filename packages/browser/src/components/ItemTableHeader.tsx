import React from 'react';
import { Table, Select } from 'semantic-ui-react';

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
          <Select
            allowAdditions
            clearable
            icon="search"
            name="keywords"
            multiple
            options={keywords?.map(a => ({ value: a, text: a })) ?? []}
            style={{ minWidth: '40%' }}
            search
            value={keywords ?? []}
            onChange={(_e, { value }): void => {
              console.log();
              const keywords =
                Array.isArray(value) && value.length > 0
                  ? value.map(a => `${a}`.split(/\s+/g).filter(a => a)).flat()
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
