export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Rect = Point & Size;

export function createCanvas(size?: Size): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');

  if (size) {
    canvas.width = size.width;
    canvas.height = size.height;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    canvas.remove();
    throw new Error('Failed to get canvas context');
  }

  return context;
}

export function imageDataToCanvas(
  imageData: ImageData,
): CanvasRenderingContext2D {
  const context = createCanvas(imageData);
  context.putImageData(imageData, 0, 0);
  return context;
}

export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve): void =>
    canvas.toBlob(resolve),
  );
  if (!blob) throw new Error('Failed to convert into Blob');

  return blob;
}

export async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const { canvas } = imageDataToCanvas(imageData);
  try {
    const blob = canvasToBlob(canvas);
    canvas.remove();
    return blob;
  } finally {
    canvas.remove();
  }
}

export function videoToCanvas(
  video: HTMLVideoElement,
): CanvasRenderingContext2D {
  const { videoWidth, videoHeight } = video;
  const context = createCanvas({ width: videoWidth, height: videoHeight });
  context.drawImage(video, 0, 0);
  return context;
}

export function getScales({
  width,
  height,
}: Size): { scale: number; center: Point } {
  return {
    scale: height / 2,
    center: {
      x: width / 2,
      y: height / 2,
    },
  };
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
  image: CanvasImageSource,
  size: Size,
): Promise<Blob> {
  const { scale, center } = getScales(size);

  const x = rect.x * scale + center.x;
  const y = rect.y * scale + center.y;
  const width = rect.width * scale;
  const height = rect.height * scale;

  const context = createCanvas({ width, height });

  context.drawImage(image, x, y, width, height, 0, 0, width, height);

  const blob = await canvasToBlob(context.canvas);

  context.canvas.remove();

  return blob;
}
