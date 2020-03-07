import { io } from '@tensorflow/tfjs';

export default class StaticIOHandler implements io.IOHandler {
  constructor(readonly modelJson: io.ModelJSON, readonly weightsUrl: string) {}

  async save(): Promise<io.SaveResult> {
    throw new Error('Unsupported');
  }

  async load(): Promise<io.ModelArtifacts> {
    const { weightsManifest, ...artifacts } = this.modelJson;

    return {
      ...artifacts,
      weightSpecs: weightsManifest.map(g => g.weights).flat(),
      weightData: await (await fetch(this.weightsUrl)).arrayBuffer(),
    } as io.ModelArtifacts;
  }
}
