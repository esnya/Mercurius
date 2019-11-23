import React from 'react';
import { withESQuery, ChildProps } from '../enhancers/withESQuery';
import {
  TableRow,
  Table,
  TableBody,
  TableCell,
  Checkbox,
  TableHeader,
  TableHeaderCell,
  Button,
  Confirm,
} from 'semantic-ui-react';
import NumberFormat from 'react-number-format';
import { del } from '../elasticsearch';

export default withESQuery(
  'rom_trading',
  {
    size: 50,
    query: {
      match_all: {},
    },
    sort: [
      {
        timestamp: {
          order: 'desc',
        },
      },
    ],
  },
  5 * 1000,
)(
  React.memo<ChildProps>(
    function DataTable(props: ChildProps): JSX.Element {
      const { value } = props;
      const rows = value.hits.hits.map(hit => {
        const { _id: id, _source: source } = hit;
        const { timestamp, name, value, drawing } = source;

        return (
          <TableRow key={id}>
            <TableCell>{id}</TableCell>
            <TableCell>{timestamp}</TableCell>
            <TableCell>{name}</TableCell>
            <TableCell textAlign="right">
              {typeof value === 'number' ? (
                <NumberFormat
                  displayType="text"
                  thousandSeparator
                  value={value}
                />
              ) : null}
            </TableCell>
            <TableCell textAlign="center">
              <Checkbox checked={drawing === true} disabled />
            </TableCell>
            <TableCell>
              <Confirm
                trigger={<Button color="red" icon="delete" />}
                onConfirm={async (): Promise<void> => {
                  await del('rom_trading', id);
                }}
              />
            </TableCell>
          </TableRow>
        );
      });

      return (
        <Table>
          <TableHeader textAlign="center">
            <TableRow>
              <TableHeaderCell>id</TableHeaderCell>
              <TableHeaderCell>timestamp</TableHeaderCell>
              <TableHeaderCell>name</TableHeaderCell>
              <TableHeaderCell>value</TableHeaderCell>
              <TableHeaderCell>drawing</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>{rows}</TableBody>
        </Table>
      );
    },
    ({ value }, { value: prevValue }) =>
      value.hits.hits[0]._id === prevValue.hits.hits[0]._id,
  ),
);
