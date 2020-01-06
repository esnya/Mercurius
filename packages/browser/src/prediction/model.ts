import _ from 'lodash';
import {
  LayersModel,
  sequential,
  loadLayersModel,
  layers,
} from '@tensorflow/tfjs';
import { ModelConfiguration } from 'mercurius-core/lib/models/ModelConfiguration';
import {
  ModelMetadata,
  ModelMetadataConverter,
} from 'mercurius-core/lib/models/ModelMetadata';
import { getSize } from './time';

export type Model = LayersModel;

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
      layers.reshape({ targetShape: [outputSize, 4] }),
    ],
  });
  model.compile(conf.compileOptions);
  return model;
}

export function loadMetadata(model: LayersModel): ModelMetadata {
  return ModelMetadataConverter.cast(model.getUserDefinedMetadata());
}

export async function load(url: string): Promise<LayersModel> {
  const model = await loadLayersModel(url);
  loadMetadata(model);
  return model;
}
