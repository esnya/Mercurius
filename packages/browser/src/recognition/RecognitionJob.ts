import RecognitionPreset from './RecognitionPreset';
import Ocr from '../utilities/ocr';
import { CollectionReference } from '../firebase';

export default class RecognitionJob {
  constructor(
    readonly options: {
      preset: RecognitionPreset;
      image: ImageBitmap;
      ocr: Ocr;
      names: string[];
      itemsRef: CollectionReference;
    },
  ) {}

  readonly state: 'ocr' | 'matching' | 'succeeded' | 'failed' = 'ocr';
}
