import defaultsDeep from 'lodash/defaultsDeep';
import DefaultRecognitionPreset from './DefaultRecognitionPreset.yml';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Rect = Point & Size;

export interface Recognition extends Rect {
  name: string;
  type: 'number' | 'text';
}

export interface Trigger extends Point {
  color: [number, number, number];
  negative?: boolean;
}

export default interface RecognitionPreset {
  recognitions: Recognition[];
  triggers: Trigger[];
  fps: number;
}

const PresetKey = 'mercurius-recognition-preset-4';
export function loadPreset(): RecognitionPreset {
  try {
    const data = localStorage.getItem(PresetKey);

    return defaultsDeep(data ? JSON.parse(data) : {}, DefaultRecognitionPreset);
  } catch {
    return DefaultRecognitionPreset;
  }
}

export function savePreset(preset: RecognitionPreset): void {
  localStorage.setItem(PresetKey, JSON.stringify(preset));
}

export function drawPreset(
  context: CanvasRenderingContext2D,
  preset: RecognitionPreset,
  rect?: Rect,
): void {
  const width = rect?.width ?? context.canvas.width;
  const height = rect?.height ?? context.canvas.height;
  const ox = rect?.x ?? 0;
  const oy = rect?.y ?? 0;

  const cx = width / 2 + ox;
  const cy = height / 2 + oy;
  const scale = 0.5 * height;

  preset.recognitions.forEach(r => {
    const x = r.x * scale + cx;
    const y = r.y * scale + cy;
    const width = r.width * scale;
    const height = r.height * scale;

    const color = 'red';

    context.strokeStyle = color;
    context.fillStyle = 'none';

    context.strokeRect(x, y, width, height);

    context.strokeStyle = 'none';
    context.fillStyle = color;
    context.fillText(r.name, x, y);

    context.stroke();
  });

  preset.triggers.forEach(r => {
    const x = r.x * scale + cx;
    const y = r.y * scale + cy;

    const color = 'blue';

    context.strokeStyle = color;
    context.fillStyle = 'none';

    context.ellipse(x, y, 3, 3, 0, 0, Math.PI * 2);

    context.strokeStyle = 'none';
    context.fillStyle = color;
    context.fillText(r.color.map(n => `${n}`).join(' '), x, y);

    context.stroke();
  });
}
