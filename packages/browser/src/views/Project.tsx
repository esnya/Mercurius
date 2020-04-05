import React from 'react';
import ItemTable from '../components/ItemTable';
import { useParams } from 'react-router';
import { assertDefined } from '../utilities/assert';
import ProjectState from '../states/ProjectState';
import { firebaseReader } from '../states/FirebaseState';

export default function ProjectHome(): JSX.Element {
  const { projectId } = useParams();
  assertDefined(projectId);

  const state = new ProjectState(firebaseReader.read(), projectId);
  return (
    <div style={{ overflow: 'auto', marginTop: 4 }}>
      <ItemTable state={state} />
    </div>
  );
}
