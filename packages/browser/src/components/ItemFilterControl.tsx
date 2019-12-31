import React, { useState } from 'react';
import { Form, Accordion } from 'semantic-ui-react';
import _ from 'lodash';
import { isDefined } from '../utilities/types';
import filters from '../definitions/filters';
import fields from '../definitions/fields';
import usePersistentState from '../hooks/usePersistentState';

export interface ItemFilter {
  search?: string;
  filterId?: string;
  itemsPerPage: number;
  fieldIds: string[];
  mingoQuery?: {};
}

export interface ItemFilterControlProps {
  projectId: string;
  itemFilter: ItemFilter;
  onChange: (value: ItemFilter) => void;
}

const fieldOptions = fields.map(({ text, id }) => ({ text, value: id }));
const filterOptions = filters.map(({ text, id }) => ({ text, value: id }));

export default function ItemFilterControl({
  projectId,
  itemFilter,
  onChange,
}: ItemFilterControlProps): JSX.Element {
  const { search, filterId, itemsPerPage, fieldIds, mingoQuery } = itemFilter;

  const [filterActive, setFilterActive] = usePersistentState<boolean>(
    'filterActive',
    false,
  );

  const [mingoQueryJson, setMingoQueryJson] = useState<string>((): string =>
    JSON.stringify(mingoQuery),
  );

  const handleChange = <K extends keyof ItemFilter>(key: K) => <
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    D extends { value?: any }
  >(
    _e: {},
    { value }: D,
  ): void => {
    if (isDefined(value)) {
      onChange({ ...itemFilter, [key]: value as ItemFilter[K] });
    }
  };

  return (
    <Accordion fluid>
      <Accordion.Title
        active={filterActive}
        onClick={(): void => setFilterActive(b => !b)}
      ></Accordion.Title>
      <Accordion.Content active={filterActive}>
        <Form id={`mercurius-project-${projectId}`}>
          <Form.Input
            label="キーワード"
            name="search"
            value={search ?? ''}
            onChange={handleChange('search')}
          />
          <Form.Select
            label="フィルター"
            name="filter"
            options={filterOptions}
            value={filterId || 'all'}
            onChange={handleChange('filterId')}
          />
          <Form.Input
            label="表示件数"
            name="items-per-page"
            type="number"
            value={itemsPerPage ?? ''}
            onChange={handleChange('itemsPerPage')}
          />
          <Form.Select
            label="カラム"
            multiple
            name="stat-fields"
            value={fieldIds}
            options={fieldOptions}
            onChange={handleChange('fieldIds')}
          />
          <Form.TextArea
            label="高度な検索 (mingo)"
            name="mingo"
            value={mingoQueryJson || ''}
            onChange={(_e, { value }): void => {
              if (typeof value !== 'string') return;
              setMingoQueryJson(value);

              try {
                const parsed = JSON.parse(value);
                if (typeof parsed !== 'object') return;

                onChange({ ...itemFilter, mingoQuery });
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </Form>
      </Accordion.Content>
    </Accordion>
  );
}
