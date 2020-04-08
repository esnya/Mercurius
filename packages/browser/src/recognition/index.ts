import { Size, Point, Rect } from './RecognitionPreset';

export function getScales(
  { width, height }: Size,
  scale: number,
): { scale: number; center: Point } {
  return {
    scale: (height / 2) * scale,
    center: {
      x: (width / 2) * scale,
      y: (height / 2) * scale,
    },
  };
}

async function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve): void =>
    canvas.toBlob(resolve),
  );
  if (!blob) throw new Error('Failed to convert into Blob');

  return blob;
}

function createCanvas({
  width,
  height,
}: Size): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Failed to get canvas rendering context');

  return { canvas, context };
}

export function bounds(rects: Rect[]): Rect {
  const left = rects.map(r => r.x).reduce((p, c) => Math.min(p, c));
  const top = rects.map(r => r.y).reduce((p, c) => Math.min(p, c));

  const right = rects.map(r => r.x + r.width).reduce((p, c) => Math.max(p, c));
  const bottom = rects
    .map(r => r.y + r.height)
    .reduce((p, c) => Math.max(p, c));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export async function crop(
  rect: Rect,
  frame: ImageBitmap,
  imageScale: number,
): Promise<Blob> {
  const { scale, center } = getScales(frame, 1);

  const x = rect.x * scale + center.x;
  const y = rect.y * scale + center.y;
  const width = rect.width * scale;
  const height = rect.height * scale;

  const { canvas, context } = createCanvas({
    width: width * imageScale,
    height: height * imageScale,
  });

  context.drawImage(
    frame,
    x,
    y,
    width,
    height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await toBlob(canvas);

  canvas.remove();

  return blob;
}
