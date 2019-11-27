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

export default class Ocr {
  constructor(words: string[], lang = 'jpn+eng', nWorkers = 1) {
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
    names: string[],
  ): Promise<{ name: string; value: number; drawing: boolean }> {
    const scheduler = await this.pScheduler;

    const res = (await scheduler.addJob('recognize', image)) as RecognizeResult;

    const lines = res.data.lines.map(line =>
      line.text.replace(/\s/g, '').replace(/[[\]]+/g, '[1]'),
    );
    console.log(lines);
    if (lines.length < 2 || lines.length > 3) {
      throw new Error(`Failed to find price from: ${lines.join('\\n')}`);
    }

    const [matchedName, score] = names.reduce(
      ([pn, ps], name: string): [string | null, number] => {
        const [n1, n2] = lines;
        const s1 = WinkDistance.string.jaroWinkler(name, n1);
        const s2 = WinkDistance.string.jaroWinkler(name, n2);
        if (s1 < s2 && s1 < ps) return [name, s1];
        if (s2 < s1 && s2 < ps) return [name, s2];

        return [pn, ps];
      },
      [null, 1] as [string | null, number],
    );
    console.log(matchedName, score);
    const name = matchedName && score < 0.2 ? matchedName : null;
    if (!name) throw new Error('Failed to recognize name');
    const drawing = lines.length === 3;
    const value = Number(lines[drawing ? 2 : 1].replace(/^0|[^0-9]+/g, ''));
    if (!value) throw new Error('Failed to recognize price');
    console.log({ name, value, drawing, matchedName, score });

    return {
      name,
      value,
      drawing,
    };
  }
}
