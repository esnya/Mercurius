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
} from 'semantic-ui-react';
import { del } from '../elasticsearch';
import ActionWithConfirm from './ActionWithConfirm';
import formatter from 'format-number';

const format = formatter();
interface RowOptions {
  id: string;
  timestamp: string;
  name: string;
  value: number;
  drawing: boolean;
}
function Row({ id, timestamp, name, value, drawing }: RowOptions): JSX.Element {
  return (
    <TableRow key={id}>
      <TableCell>{id}</TableCell>
      <TableCell>{timestamp}</TableCell>
      <TableCell>{name}</TableCell>
      <TableCell>{format(value)}</TableCell>
      <TableCell textAlign="center">
        <Checkbox checked={drawing === true} disabled />
      </TableCell>
      <TableCell>
        <ActionWithConfirm
          trigger={<Button color="red" icon="delete" />}
          action={(): void => {
            del('rom_trading', id);
          }}
        />
      </TableCell>
    </TableRow>
  );
}

interface Source {
  timestamp: string;
  name: string;
  value: number;
  drawing: boolean;
}

export default withESQuery<Source>(
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
  React.memo(
    function DataTable(props: ChildProps<Source>): JSX.Element {
      const { value } = props;
      const rows = value.hits.hits.map(hit => {
        const { _id: id, _source: source } = hit;
        const { timestamp, name, value, drawing } = source;

        return <Row key={id} {...{ id, timestamp, name, value, drawing }} />;
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
