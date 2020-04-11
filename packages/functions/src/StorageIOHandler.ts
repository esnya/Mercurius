import { io } from '@tensorflow/tfjs';
import { Bucket, File } from '@google-cloud/storage';

export default class StorageIOHandler implements io.IOHandler {
  constructor(readonly bucket: Bucket, readonly path?: string) {}

  file(name: string): File {
    return this.bucket.file(this.path ? `${this.path}/${name}` : name);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async save(modelArtifacts: io.ModelArtifacts): Promise<io.SaveResult> {
    throw new Error('Unsupported');
  }

  async load(): Promise<io.ModelArtifacts> {
    const { weightsManifest, ...model } = JSON.parse(
      (await this.file('model.json').download())[0].toString(),
    );
    const paths = weightsManifest[0].paths as string[];
    const buffers = await Promise.all(
      paths.map(async (path: string) => (await this.file(path).download())[0]),
    );
    const buffer = Buffer.concat(buffers);

    const weightData = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(weightData);
    for (let i = 0; i < buffer.length; ++i) {
      view[i] = buffer[i];
    }

    return {
      ...model,
      weightSpecs: weightsManifest[0].weights,
      weightData,
    };
  }
}
