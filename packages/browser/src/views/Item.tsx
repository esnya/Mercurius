import React, { useState } from 'react';
import _ from 'lodash';
import {
  Container,
  Loader,
  Dimmer,
  Message,
  Segment,
  Icon,
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
import useFirebase from '../hooks/useFirebase';
import { DateTime, Duration } from 'luxon';
import { Timestamp } from '../firebase';
import {
  DefaultModelConfiguration,
  Model,
  load,
  predict,
  compile,
  fit,
  PredictionResult,
} from '../ai';
import {
  ModelConfiguration,
  ModelConfigurationConverter,
} from 'mercurius-core/lib/models/ModelConfiguration';
import PriceChart from '../components/PriceChart';

export default function Item(): JSX.Element {
  const app = useFirebase();
  const { projectId, itemId } = useParams();
  const [modelConfig, setModelConfig] = usePersistentState<ModelConfiguration>(
    `model-configuration-${projectId}`,
    DefaultModelConfiguration,
  );

  const { duration } = modelConfig;

  const priceSnapshots = useQuerySnapshot(
    firestore =>
      firestore
        .collection(`projects/${projectId}/items/${itemId}/prices`)
        .orderBy('timestamp', 'asc')
        .startAt(
          Timestamp.fromDate(
            DateTime.local()
              .minus(Duration.fromISO(duration))
              .toJSDate(),
          ),
        ),
    PriceConverter.cast,
    [duration],
  );

  const modelUrl = `indexeddb://mercurius-${projectId}-${itemId}-prices`;
  const loadedModel = useAsyncSimple(_.partial(load, modelUrl), [modelUrl]);

  const [model, setModel] = useState<Model>();

  useAsyncEffect(async (): Promise<void> => {
    if (isSucceeded(loadedModel)) {
      return setModel(loadedModel);
    }
  }, [loadedModel, modelUrl, priceSnapshots]);

  const predicted = useAsyncSimple(async (): Promise<
    PredictionResult[] | undefined
  > => {
    if (
      !isSucceeded(model) ||
      !model ||
      !isSucceeded(priceSnapshots) ||
      priceSnapshots.length === 0
    )
      return;

    return await predict(
      model,
      priceSnapshots.map(s => s.data),
    );
  }, [model, priceSnapshots]);

  if (!projectId || !itemId) {
    return <NotFound />;
  }

  if (isFailed(priceSnapshots)) {
    return <Message negative>{priceSnapshots.toString()}</Message>;
  }
  if (isFailed(predicted)) {
    return <Message negative>{predicted.toString()}</Message>;
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
      modelConfig.fitOptions,
    );
    await model.save(modelUrl);
    setModel(model);
  };

  const predictedChart = predicted ? (
    <PredictedChart predicted={predicted} />
  ) : (
    <Message info>モデルが作成されていません。</Message>
  );

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
        </Segment>
        <Segment>
          <ActionButton action={handleUpdate} color="blue">
            <Icon name="detective" />
            {predicted ? '再学習' : '学習'}
          </ActionButton>
        </Segment>
      </Segment.Group>
    </Container>
  );
}
