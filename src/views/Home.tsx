import React from 'react';
import { Container, Segment } from 'semantic-ui-react';
import AddForm from '../components/AddForm';
import DataTable from '../components/DataTable';

export default function Home(): JSX.Element {
  return (
    <Container>
      <Segment>
        <AddForm />
      </Segment>
      <DataTable />
    </Container>
  );
}
