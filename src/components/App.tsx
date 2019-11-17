import React from 'react';
import { Container, Segment } from 'semantic-ui-react';
import AddForm from './AddForm';
import DataTable from './DataTable';

export default function App(): JSX.Element {
  return (
    <Container>
      <Segment>
        <AddForm />
      </Segment>
      <DataTable />
    </Container>
  );
}
