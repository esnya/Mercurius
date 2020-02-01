import React from 'react';
import ItemTable from '../components/ItemTable';
import { useParams } from 'react-router';
import { assertDefined } from '../utilities/assert';

export default function ProjectHome(): JSX.Element {
  const { projectId } = useParams();
  assertDefined(projectId);

  return (
    <div style={{ overflow: 'auto', marginTop: 4 }}>
      <ItemTable projectId={projectId} />
    </div>
  );
}
