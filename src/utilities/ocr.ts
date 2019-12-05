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

export default class Ocr {
  constructor(readonly words: string[], lang = 'jpn+eng', nWorkers = 1) {
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
      tessedit_char_whitelist: ['0123456789,:', ...words].join(''),
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
    image: Blob,
  ): Promise<{
    name?: string;
    value?: number;
    drawing: boolean;
    nameCandidates?: { name: string; score: number }[];
  }> {
    const scheduler = await this.pScheduler;

    const res = (await scheduler.addJob('recognize', image)) as RecognizeResult;

    const lines = res.data.lines.map(line => line.text.replace(/\s/g, ''));
    console.log(lines);
    if (lines.length < 2 || lines.length > 3) {
      return {
        drawing: false,
      };
    }
    const drawing = lines.length === 3;

    const [n1, n2] = lines;
    const nameCandidates = _(this.words)
      .map(name => [
        { name, score: WinkDistance.string.jaroWinkler(name, n1) },
        ...(drawing
          ? [{ name, score: WinkDistance.string.jaroWinkler(name, n2) }]
          : []),
      ])
      .flatten()
      .filter(({ score }) => score < 0.6)
      .sortBy(({ score }) => score)
      .value();

    const front = nameCandidates[0];
    const name = front && front.score < 0.3 ? front.name : undefined;
    const value =
      Number(lines[drawing ? 2 : 1].replace(/^0|[^0-9]+/g, '')) || undefined;

    return {
      name,
      nameCandidates: [
        ...(!name
          ? []
          : drawing
          ? [
              { name: n1, score: 1 },
              { name: n2, score: 1 },
            ]
          : [{ name: n1, score: 1 }]),
        ...nameCandidates,
      ],
      value,
      drawing,
    };
  }
}
