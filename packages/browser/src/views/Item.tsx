import React, { useState, Suspense } from 'react';
import {
  Container,
  Loader,
  Dimmer,
  Segment,
  Placeholder,
  Button,
} from 'semantic-ui-react';
import { useParams, Link } from 'react-router-dom';
import useAsyncEffect from '../hooks/useAsyncEffect';
import { initializeApp } from '../firebase';
import ItemIndices from '../components/ItemIndices';
import ItemDetails from '../components/ItemDetails';
import { schemaConverter } from '../firebase/converters';
import Item from 'mercurius-core/lib/models-next/Item';
import ItemSchema from 'mercurius-core/lib/models-next/Item.schema.json';
import ItemPriceChart from '../components/ItemPriceChart';
import ErrorBoundary from 'react-error-boundary';

const app$ = initializeApp();
async function getItemReference(
  projectId: string,
  itemId: string,
): Promise<firebase.firestore.DocumentReference<Item>> {
  const app = await app$;
  return app
    .firestore()
    .doc(`projects/${projectId}/items/${itemId}`)
    .withConverter(schemaConverter<Item>(ItemSchema));
}

function useDocument<T>(
  init: () => Promise<firebase.firestore.DocumentReference<T>>,
  dependsOn?: unknown[],
): firebase.firestore.DocumentSnapshot<T> | undefined {
  const [value, set] = useState<firebase.firestore.DocumentSnapshot<T>>();

  useAsyncEffect(async () => {
    const ref = await init();
    return ref.onSnapshot(set, error => console.error(error));
  }, dependsOn);

  return value;
}

function isExists<T>(
  snapshot: firebase.firestore.DocumentSnapshot<T>,
): snapshot is firebase.firestore.QueryDocumentSnapshot<T> {
  return snapshot.exists;
}

export default function Item(): JSX.Element {
  const { projectId, itemId } = useParams();
  if (!projectId || !itemId) {
    throw new Error();
  }

  const itemSnapshot = useDocument(() => getItemReference(projectId, itemId), [
    projectId,
    itemId,
  ]);
  if (!itemSnapshot) {
    return (
      <Dimmer active>
        <Loader />
      </Dimmer>
    );
  }
  if (!isExists(itemSnapshot)) {
    throw new Error('Item not found');
  }
  return (
    <Container>
      <Segment.Group>
        <ItemDetails projectId={projectId} itemId={itemId} />
        <Segment>
          <Button
            as={Link}
            icon="table"
            to={`/projects/${projectId}/items/${itemId}/prices`}
          />
          <ItemPriceChart itemSnapshot={itemSnapshot} />
        </Segment>
        <Segment>
          <Suspense
            fallback={
              <Placeholder>
                <Placeholder.Image />
              </Placeholder>
            }
          >
            <ErrorBoundary>
              <ItemIndices projectId={projectId} itemId={itemId} />
            </ErrorBoundary>
          </Suspense>
        </Segment>
      </Segment.Group>
    </Container>
  );
}
