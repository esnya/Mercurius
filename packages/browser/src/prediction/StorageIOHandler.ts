import { io } from '@tensorflow/tfjs';
import { isDefined } from '../utilities/types';
import { assertDefined } from '../utilities/assert';
import _ from 'lodash';

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

  private async fetch(url: string, contentType: string): Promise<Response> {
    const response = await fetch(url, {});

    if (!response.ok) {
      throw new Error(await response.text());
    }
    if (response.headers.get('Content-Type') !== contentType) {
      throw new Error('Invalid content type');
    }

    return response;
  }

  private async download(
    ref: Reference,
    contentType: string,
  ): Promise<Response> {
    return await this.fetch(await ref.getDownloadURL(), contentType);
  }
  private async downloadJson(ref: Reference): Promise<io.ModelArtifacts> {
    return await (await this.download(ref, 'application/json')).json();
  }
  private async downloadBinary(ref: Reference): Promise<ArrayBuffer> {
    return await (
      await this.download(ref, 'application/octet-stream')
    ).arrayBuffer();
  }

  private async loadWeights(
    weightsManifest: io.WeightsManifestConfig,
  ): Promise<{
    weightData: ArrayBuffer;
    weightSpecs?: io.WeightsManifestEntry[];
  }> {
    if (!weightsManifest) {
      return {
        weightData: await this.downloadBinary(this.weightDataRef),
      };
    }

    const dirRef = this.modelRef.parent;
    assertDefined(dirRef);

    const paths = weightsManifest.map(g => g.paths).flat();
    const weightSpecs = weightsManifest.map(g => g.weights).flat();

    const shards = await Promise.all(
      paths.map(async path => {
        const ref = dirRef.child(path);
        return new Uint8Array(await this.downloadBinary(ref));
      }),
    );

    const dataLength = _(shards)
      .map(a => a.byteLength)
      .sum();
    const view = new Uint8Array(dataLength);

    let left = 0;
    for (let i = 0; i < shards.length; i++) {
      view.set(shards[i], left);
      left += shards[i].byteLength;
    }

    return {
      weightData: view.buffer,
      weightSpecs,
    };
  }

  async load(): Promise<io.ModelArtifacts> {
    const { weightsManifest, ...others } = (await this.downloadJson(
      this.modelRef,
    )) as io.ModelJSON;

    return {
      ...others,
      ...(await this.loadWeights(weightsManifest)),
    } as io.ModelArtifacts;
  }
}
