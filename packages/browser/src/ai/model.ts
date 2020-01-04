import _ from 'lodash';
import {
  LayersModel,
  sequential,
  loadLayersModel,
  layers,
} from '@tensorflow/tfjs';
import { show } from '@tensorflow/tfjs-vis';
import { ModelConfiguration } from 'mercurius-core/lib/models/ModelConfiguration';
import {
  ModelMetadata,
  ModelMetadataConverter,
} from 'mercurius-core/lib/models/ModelMetadata';

export type Model = LayersModel;

export function compile(conf: ModelConfiguration): LayersModel {
  const model = sequential({
    layers: [
      layers.reshape({
        inputShape: [conf.inputSize, 2],
        targetShape: [conf.inputSize * 2, 1],
      }),
      ...conf.layers.map(({ type, options }) =>
        _.invoke(layers, type, options),
      ),
      layers.reshape({ targetShape: [conf.outputSize, 3] }),
    ],
  });
  model.compile(conf.compileOptions);
  show.modelSummary({ name: 'model' }, model);
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
