import _ from 'lodash';
import {
  LayersModel,
  sequential,
  loadLayersModel,
  layers,
  io,
} from '@tensorflow/tfjs';
import { ModelConfiguration } from 'mercurius-core/lib/models/ModelConfiguration';
import {
  ModelMetadata as SerializedModelMetadata,
  ModelMetadataConverter,
} from 'mercurius-core/lib/models/ModelMetadata';
import { getSize } from './time';
import { Duration } from 'luxon';
import { labelKeys } from './labels';

export type Model = LayersModel;

export interface ModelMetadata
  extends Omit<SerializedModelMetadata, 'timeUnit'> {
  timeUnit: Duration;
}

export function compile(conf: ModelConfiguration): LayersModel {
  const inputSize = getSize(conf.inputDuration, conf.timeUnit);
  const outputSize = getSize(conf.outputDuration, conf.timeUnit);

  const model = sequential({
    layers: [
      layers.reshape({
        inputShape: [inputSize, 2],
        targetShape: [inputSize, 2],
      }),
      ...conf.layers.map(({ type, options }) =>
        _.invoke(layers, type, options),
      ),
      layers.reshape({ targetShape: [outputSize, labelKeys.length] }),
    ],
  });

  model.compile(conf.compileOptions);

  return model;
}

export function loadMetadata(model: LayersModel): ModelMetadata {
  const { timeUnit, ...others } = ModelMetadataConverter.cast(
    model.getUserDefinedMetadata(),
  );

  return {
    ...others,
    timeUnit: Duration.fromISO(timeUnit),
  };
}

export async function load(
  loader: string | io.IOHandler,
): Promise<LayersModel> {
  const model = await loadLayersModel(loader);
  loadMetadata(model);
  return model;
}
