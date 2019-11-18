import React from 'react';
import { withESQuery } from '../enhancers/withESQuery';
import {
  TableRow,
  Table,
  TableBody,
  TableCell,
  Checkbox,
  TableHeader,
  TableHeaderCell,
  Button,
  Modal,
  ModalHeader,
  ModalDescription,
  Confirm,
} from 'semantic-ui-react';
import NumberFormat from 'react-number-format';
import { del } from '../elasticsearch';

export default withESQuery({
  index: 'rom_trading',
  body: {
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
  watch: 5 * 1000,
})(({ result }) => {
  const rows = result.hits.hits.map(hit => (
    <TableRow key={hit._id}>
      <TableCell>{hit._id}</TableCell>
      <TableCell>{hit._source.timestamp}</TableCell>
      <TableCell>{hit._source.name}</TableCell>
      <TableCell textAlign="right">
        <NumberFormat
          displayType="text"
          thousandSeparator
          value={hit._source.value}
        />
      </TableCell>
      <TableCell textAlign="center">
        <Checkbox checked={hit._source.drawing} disabled />
      </TableCell>
      <TableCell>
        <Confirm
          trigger={<Button color="red" icon="delete" />}
          onConfirm={() => del('rom_trading', hit._id)}
        />
      </TableCell>
    </TableRow>
  ));

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
});
