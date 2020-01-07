import React, { useState, useRef, useMemo } from 'react';
import {
  Container,
  Loader,
  Dimmer,
  Message,
  Segment,
  Icon,
  Button,
  Form,
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
import PredictedChart from '../components/PredictedChart';
import usePersistentState from '../hooks/usePersistentState';
import ItemView from '../components/ItemView';
import { DateTime, Duration } from 'luxon';
import { Timestamp, initializeApp } from '../firebase';
import {
  Model,
  load,
  predict,
  compile,
  fit,
  PredictionResult,
} from '../prediction';
import {
  ModelConfiguration,
  ModelConfigurationConverter,
} from 'mercurius-core/lib/models/ModelConfiguration';
import DefaultModelConfiguration from '../prediction/DefaultModelConfiguration.yml';
import PriceChart from '../components/PriceChart';
import { toDuration, getSize } from '../prediction/time';
import { getCurrentUser } from '../firebase/auth';
import PromiseReader from '../suspense/PromiseReader';
import StorageIOHandler from '../prediction/StorageIOHandler';

const resources = {
  app: new PromiseReader(initializeApp),
  user: new PromiseReader(getCurrentUser),
};

export default function Item(): JSX.Element {
  const app = resources.app.read();
  const storage = app.storage();
  const { uid } = resources.user.read();

  const viewRef = useRef<HTMLDivElement>(null);
  const { projectId, itemId } = useParams();
  const [modelConfig, setModelConfig] = usePersistentState<ModelConfiguration>(
    `model-configuration-${projectId}-3`,
    DefaultModelConfiguration,
  );

  const min = modelConfig.timeDomain.min;

  const priceSnapshots = useQuerySnapshot(
    firestore =>
      firestore
        .collection(`projects/${projectId}/items/${itemId}/prices`)
        .orderBy('timestamp', 'asc')
        .startAt(
          Timestamp.fromDate(
            DateTime.local()
              .minus(Duration.fromISO(min))
              .toJSDate(),
          ),
        ),
    PriceConverter.cast,
    [min],
  );

  const modelPath = `/projects/${projectId}/users/${uid}/items/${itemId}/models/prices_1`;
  const modelIOHandler = useMemo(
    () => new StorageIOHandler(storage.ref(modelPath)),
    [modelPath],
  );
  const loadedModel = useAsyncSimple(() => load(modelIOHandler), [
    modelIOHandler,
  ]);

  const [model, setModel] = useState<Model>();

  useAsyncEffect(async (): Promise<void> => {
    if (isSucceeded(loadedModel)) {
      return setModel(loadedModel);
    }
  }, [loadedModel]);

  const predicted = useAsyncSimple(async (): Promise<
    PredictionResult[] | undefined
  > => {
    if (
      !isSucceeded(model) ||
      !model ||
      !isSucceeded(priceSnapshots) ||
      priceSnapshots.length === 0
    ) {
      return;
    }

    return await predict(
      model,
      priceSnapshots.map(s => s.data),
      toDuration(modelConfig.timeUnit),
    );
  }, [model, priceSnapshots]);

  if (!projectId || !itemId) {
    return <NotFound />;
  }

  if (isFailed(priceSnapshots)) {
    return <Message negative>{priceSnapshots.toString()}</Message>;
  }
  if (isFailed(app)) {
    return <Message negative>{app.toString()}</Message>;
  }

  if (!isSucceeded(priceSnapshots) || !isSucceeded(app)) {
    return (
      <Dimmer active>
        <Loader />
      </Dimmer>
    );
  }

  const handleUpdate = async (): Promise<void> => {
    const model = compile(modelConfig);
    await fit(
      model,
      priceSnapshots.map(s => s.data),
      toDuration(modelConfig.timeUnit),
      modelConfig.fitOptions,
      viewRef.current ?? undefined,
    );
    setModel(model);
    await model.save(modelIOHandler);
  };

  const predictedChart = isSucceeded(predicted) ? (
    <PredictedChart predicted={predicted} />
  ) : isFailed(predicted) ? (
    <Message negative>{predicted.toString()}</Message>
  ) : (
    <Message info>モデルが作成されていません。</Message>
  );

  const handleReset = (): void => setModelConfig(DefaultModelConfiguration);

  return (
    <Container>
      <Segment.Group>
        <Segment>
          <ItemView
            itemRef={app
              .firestore()
              .doc(`projects/${projectId}/items/${itemId}`)}
          />
        </Segment>
        <Segment>
          <PriceChart prices={priceSnapshots.map(p => p.data)} />
        </Segment>
        <Segment>{predictedChart}</Segment>
        <Segment>
          <ConfigurationEditor
            validate={ModelConfigurationConverter.cast}
            value={modelConfig}
            onChange={setModelConfig}
          />
          <Form>
            <Form.Input
              label="xSize"
              readOnly
              value={getSize(modelConfig.inputDuration, modelConfig.timeUnit)}
            />
            <Form.Input
              label="ySize"
              readOnly
              value={getSize(modelConfig.outputDuration, modelConfig.timeUnit)}
            />
          </Form>
        </Segment>
        <Segment>
          <ActionButton action={handleUpdate} color="blue">
            <Icon name="detective" />
            {predicted ? '再学習' : '学習'}
          </ActionButton>
          <Button color="red" onClick={handleReset}>
            モデルをリセット
          </Button>
        </Segment>
        <Segment>
          <div ref={viewRef}>
            <Message info>学習経過がここに表示されます</Message>
          </div>
        </Segment>
      </Segment.Group>
    </Container>
  );
}
