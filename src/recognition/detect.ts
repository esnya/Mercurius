import Ocr from '../utilities/ocr';
import RecognitionPreset from './RecognitionPreset';
import { CollectionReference } from '../firebase';

let prevTriggered = false;

export default async function detect(
  preset: RecognitionPreset,
  itemsRef: CollectionReference,
  stream: MediaStream,
  onFrame: (ocr: Ocr, frame: ImageBitmap, names: string[]) => void,
): Promise<(() => void) | void> {
  const [track] = stream.getVideoTracks();
  if (!track) return;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  const context = canvas.getContext('2d');
  if (!context) return;

  const names = (await itemsRef.get()).docs
    .map(doc => doc.get('name'))
    .filter(a => Boolean(a));
  const ocr = new Ocr(names);

  const capture = new ImageCapture(track);

  const interval = setInterval(async (): Promise<void> => {
    const frame = await capture.grabFrame();
    const { width, height } = frame;

    const scale = height / 2;
    const cx = width / 2;
    const cy = height / 2;

    const triggered = preset.triggers.every((trigger): boolean => {
      const x = trigger.x * scale + cx;
      const y = trigger.y * scale + cy;

      context.drawImage(frame, x, y, 1, 1, 0, 0, 1, 1);
      const { data } = context.getImageData(0, 0, 1, 1);

      return trigger.color.every((c, i) => data[i] === c);
    });

    if (!prevTriggered && triggered) {
      onFrame(ocr, frame);
    }

    prevTriggered = triggered;
  }, 1000 / preset.fps);

  return (): void => {
    clearInterval(interval);
    canvas.remove();
  };
}
