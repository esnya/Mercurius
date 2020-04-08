/* eslint @typescript-eslint/camelcase: off */

import WinkDistance from 'wink-distance';
import {
  createWorker,
  PSM,
  RecognizeResult,
  createScheduler,
  Scheduler,
  OEM,
  WorkerParams,
  Worker,
} from 'tesseract.js';
import _ from 'lodash';
import RecognitionPreset from '../recognition/RecognitionPreset';
import { getScales } from '../recognition';
import { imageDataToBlob } from './image';

export default class Ocr {
  constructor(readonly words: string[], lang = 'jpn+eng', nWorkers = 4) {
    this.pScheduler = this.init(words, lang);

    this.addWorkers(words, lang, nWorkers - 1);
  }

  private pScheduler: Promise<Scheduler>;

  private async createWorker(words: string[], lang: string): Promise<Worker> {
    const worker = createWorker({
      // logger: console.log,
    });
    await worker.load();
    await worker.loadLanguage(lang);
    await worker.initialize(lang);
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      tessedit_ocr_engine_mode: OEM.DEFAULT,
      tessedit_char_whitelist: ['0123456789,:', ...words]
        .join('')
        .replace(/[a-zA-Z]/g, ''),
    } as Partial<WorkerParams>);
    return worker;
  }

  private async init(words: string[], lang: string): Promise<Scheduler> {
    const scheduler = createScheduler();
    scheduler.addWorker(await this.createWorker(words, lang));
    return scheduler;
  }

  private async addWorkers(
    words: string[],
    lang: string,
    nWorkers: number,
  ): Promise<void> {
    const scheduler = await this.pScheduler;
    for (let i = 0; i < nWorkers; i++) {
      scheduler.addWorker(await this.createWorker(words, lang));
    }
  }

  async recognize(
    canvas: HTMLCanvasElement,
    preset: RecognitionPreset,
  ): Promise<{
    name?: string;
    value?: number;
    drawing: boolean;
    nameCandidates?: { name: string; score: number }[];
  }> {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get canvas context');

    const scheduler = await this.pScheduler;

    const results = await Promise.all(
      preset.recognitions.map(
        async ({
          name,
          ...rect
        }): Promise<{ name: string; text: string | null }> => {
          try {
            const { scale, center } = getScales(canvas, 1);

            const x = rect.x * scale + center.x;
            const y = rect.y * scale + center.y;
            const width = rect.width * scale;
            const height = rect.height * scale;

            const imageData = context.getImageData(x, y, width, height);
            const image = await imageDataToBlob(imageData);

            const res = (await scheduler.addJob(
              'recognize',
              image,
            )) as RecognizeResult;

            const text = res.data.text.replace(/\s/g, '');

            if (!text) throw new Error(`Failed to recognize ${name}`);

            return {
              name,
              text,
            };
          } catch (error) {
            console.error(error);

            return { name, text: null };
          }
        },
      ),
    );

    const drawing =
      _(results)
        .filter(({ name }) => name === 'lottery')
        .map(({ text }) => Boolean(text && text.match(/[0-9]/)))
        .first() || false;
    const recognizedName = _(results)
      .filter(({ name }) => name === 'name')
      .map(({ text }) => text)
      .first();
    const value = _(results)
      .filter(({ name }) => name === 'price')
      .map(({ text }) => Number(text && text.replace(/[^0-9]/g, '')))
      .filter(v => v > 0)
      .first();
    console.log(recognizedName, value, drawing);

    const nameCandidates = recognizedName
      ? _(this.words)
          .map(name => ({
            name,
            score: WinkDistance.string.jaroWinkler(name, recognizedName),
          }))
          .filter(({ score }) => score < 0.6)
          .sortBy(({ score }) => score)
          .value()
      : [];

    const [first, second] = nameCandidates || [];
    const name =
      first && first.score < 0.3 && (!second || second.score !== first.score)
        ? first.name
        : undefined;

    return {
      name,
      nameCandidates,
      value,
      drawing,
    };
  }
}
