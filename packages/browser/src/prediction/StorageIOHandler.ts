import { io } from '@tensorflow/tfjs';
import { isDefined } from '../utilities/types';
import { all } from '../utilities/promise';

type Reference = firebase.storage.Reference;

export default class StorageIOHandler implements io.IOHandler {
  constructor(readonly ref: Reference) {}

  get modelRef(): Reference {
    return this.ref.child('model.json');
  }

  get weightDataRef(): Reference {
    return this.ref.child('model.weights.bin');
  }

  async save(modelArtifacts: io.ModelArtifacts): Promise<io.SaveResult> {
    const { weightData, ...modelJson } = modelArtifacts;

    await this.modelRef.put(
      new Blob([JSON.stringify(modelJson, null, 2)], {
        type: 'application/json',
      }),
    );
    if (isDefined(weightData)) {
      await this.weightDataRef.put(
        new Blob([weightData], { type: 'application/octet-stream' }),
      );
    }

    return {
      modelArtifactsInfo: io.getModelArtifactsInfoForJSON(modelArtifacts),
    };
  }

  private async fetch(url: string, contentType: string): Promise<Body> {
    const response = await fetch(url, {});

    if (!response.ok) {
      throw new Error(await response.text());
    }
    if (response.headers.get('Content-Type') !== contentType) {
      throw new Error('Invalid content type');
    }

    return response;
  }

  async load(): Promise<io.ModelArtifacts> {
    const [modelUrl, weightDataUrl] = await all(
      this.modelRef.getDownloadURL(),
      this.weightDataRef.getDownloadURL(),
    );

    const [modelJson, weightData] = await all(
      this.fetch(modelUrl, 'application/json').then(r => r.json()),
      this.fetch(weightDataUrl, 'application/octet-stream').then(r =>
        r.arrayBuffer(),
      ),
    );

    return {
      ...modelJson,
      weightData,
    };
  }
}
