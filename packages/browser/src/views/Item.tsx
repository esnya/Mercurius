import React, { useState, useRef, useMemo, Suspense, useEffect } from 'react';
import _ from 'lodash';
import {
  Container,
  Loader,
  Dimmer,
  Message,
  Segment,
  Icon,
  Button,
  Form,
  Placeholder,
} from 'semantic-ui-react';
import { useQuerySnapshot } from '../hooks/useSnapshot';
import { useParams } from 'react-router-dom';
import NotFound from './NotFound';
import { PriceConverter } from 'mercurius-core/lib/models/Price';
import { isFailed, isSucceeded } from '../utilities/types';
import useAsyncSimple from '../hooks/useAsyncSimple';
import useAsyncEffect from '../hooks/useAsyncEffect';
import ActionButton from '../components/ActionButton';
import ConfigurationEditor from '../components/ConfigurationEditor';
import usePersistentState from '../hooks/usePersistentState';
import { DateTime, Duration } from 'luxon';
import { Timestamp, initializeApp } from '../firebase';
import {
  Model,
  load,
  compile,
  fit,
  interpolate,
  quantize,
  keepStats,
  normalize,
  predict,
  PredictionResult,
} from '../prediction';
import {
  ModelConfiguration,
  ModelConfigurationConverter,
} from 'mercurius-core/lib/models/ModelConfiguration';
import DefaultModelConfiguration from '../prediction/DefaultModelConfiguration.yml';
import { toDuration, getSize } from '../prediction/time';
import { getCurrentUser } from '../firebase/auth';
import PromiseReader from '../suspense/PromiseReader';
import StorageIOHandler from '../prediction/StorageIOHandler';
import SimpleAccordion from '../components/SimpleAccordion';
import View from '../prediction/view';
import { getLabels } from '../prediction/labels';
import PredictedChart from '../components/PredictedChart';
import ItemIndices from '../components/ItemIndices';
import ItemDetails from '../components/ItemDetails';
import { schemaConverter } from '../firebase/converters';
import Item from 'mercurius-core/lib/models-next/Item';
import ItemSchema from 'mercurius-core/lib/models-next/Item.schema.json';
import FirestoreDocumentModel from '../models/FirestoreDocumentModel';
import ItemPriceChart from '../components/ItemPriceChart';

const resources = {
  app: new PromiseReader(initializeApp),
  user: new PromiseReader(getCurrentUser),
};

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
  const app = resources.app.read();
  const storage = app.storage();
  const { uid } = resources.user.read();

  const viewRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
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
            <ItemIndices projectId={projectId} itemId={itemId} />
          </Suspense>
        </Segment>
      </Segment.Group>
    </Container>
  );
}
