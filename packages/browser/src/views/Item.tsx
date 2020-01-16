import React, { useState, useRef, useMemo } from 'react';
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
import ItemView from '../components/ItemView';
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
import PriceChart from '../components/PriceChart';
import { toDuration, getSize } from '../prediction/time';
import { getCurrentUser } from '../firebase/auth';
import PromiseReader from '../suspense/PromiseReader';
import StorageIOHandler from '../prediction/StorageIOHandler';
import SimpleAccordion from '../components/SimpleAccordion';
import View from '../prediction/view';
import { getLabels } from '../prediction/labels';
import PredictedChart from '../components/PredictedChart';

const resources = {
  app: new PromiseReader(initializeApp),
  user: new PromiseReader(getCurrentUser),
};

export default function Item(): JSX.Element {
  const app = resources.app.read();
  const storage = app.storage();
  const { uid } = resources.user.read();

  const viewRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const { projectId, itemId } = useParams();
  const [modelConfig, setModelConfig] = usePersistentState<ModelConfiguration>(
    `model-configuration-${projectId}-4`,
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

  useAsyncEffect(async (): Promise<void> => {
    if (
      !infoRef.current ||
      !isSucceeded(priceSnapshots) ||
      priceSnapshots.length === 0
    ) {
      return;
    }

    const timeUnit = Duration.fromISO(modelConfig.timeUnit);
    const prices = _.sortBy(
      priceSnapshots.map(p => p.data),
      p => p.timestamp,
    );
    const quantized = quantize(prices, timeUnit);
    const stats = keepStats(quantized);
    const interpolated = interpolate(quantized, stats, timeUnit);
    const normalized = normalize(interpolated, stats);
    const labels = getLabels(
      interpolated,
      timeUnit,
      Duration.fromISO(modelConfig.benefitDuration),
    );

    const view = new View(infoRef.current);
    view.lineChart(
      {
        price: interpolated.map(p => p.price),
      },
      'x: interpolated',
    );
    view.lineChart(
      {
        price: normalized.map(p => p.price),
        lottery: normalized.map(p => p.lottery),
      },
      'x: normalized',
    );
    view.lineChart(
      {
        purchase: labels.map(l => l.purchase).map(Number),
        divestment: labels.map(l => l.divestment).map(Number),
      },
      'label: benefits',
    );
    view.lineChart(
      {
        increase: labels.map(l => l.increase).map(Number),
        decrease: labels.map(l => l.decrease).map(Number),
      },
      'label: changes',
    );
  }, [priceSnapshots, modelConfig, model]);

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
      toDuration(modelConfig.benefitDuration),
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
          <PriceChart name={itemId} prices={priceSnapshots.map(p => p.data)} />
        </Segment>
        <Segment>{predictedChart}</Segment>
        <Segment>
          <SimpleAccordion title="AI設定">
            <Segment.Group>
              <Segment>
                <ActionButton action={handleUpdate} color="blue">
                  <Icon name="detective" />
                  学習
                </ActionButton>
                <Button color="red" onClick={handleReset}>
                  モデルをリセット
                </Button>
              </Segment>
              <Segment>
                <div ref={infoRef}></div>
                <div ref={viewRef}>
                  <Message info>学習経過がここに表示されます</Message>
                </div>
              </Segment>
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
                    value={getSize(
                      modelConfig.inputDuration,
                      modelConfig.timeUnit,
                    )}
                  />
                  <Form.Input
                    label="ySize"
                    readOnly
                    value={getSize(
                      modelConfig.outputDuration,
                      modelConfig.timeUnit,
                    )}
                  />
                </Form>
              </Segment>
            </Segment.Group>
          </SimpleAccordion>
        </Segment>
      </Segment.Group>
    </Container>
  );
}
