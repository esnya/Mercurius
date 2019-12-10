declare type EventHandler<E extends Event = Event> = (event: E) => void;

declare interface MediaDevices {
  getDisplayMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
}

declare enum RecordingState {
  "inactive",
  "recording",
  "paused"
}


declare class BlobEvent extends Event {
  readonly data: Blob;
  readonly timecode: number;
}

declare class MediaRecorder extends EventTarget {
  constructor(stream: MediaStream, options?: {
    mimeType?: string,
    bitsPerSecond?: number,
    videoBitsPerSecond?: number,
    audioBitsPerSecond?: number,
  });

  readonly stream: MediaStream;
  readonly mimeType: string;
  readonly state: RecordingState;
  onstart: EventHandler;
  onstop: EventHandler;
  ondataavailable: EventHandler;
  onpause: EventHandler;
  onresume: EventHandler;
  onerror: EventHandler;
  readonly videoBitsPerSecond: number;
  readonly audioBitsPerSecond: number;

  start(timeSlice?: number): void;
  stop(): void;
  pause(): void;
  resume(): void;
  requestData(): void;

  static isTypeSupported(type: string): boolean;

  addEventListener(event: 'dataavailable', listener: (event: BlobEvent) => void): MediaRecorder;
}

declare interface PhotoCapabilities {
  fillLightMode: 'auto' | 'off' | 'on';
  imageHeight: number;
  imageWidth: number;
  redEyeReduction: boolean;
}

declare interface PhotoSettings {
  fillLightMode: 'auto' | 'off' | 'on';
  imageHeight: number;
  imageWidth: number;
  redEyeReduction: boolean;
}

declare class ImageCapture extends EventTarget {
  constructor(videoTrack: MediaStreamTrack);

  readonly track: MediaStreamTrack;
  takePhoto(): Promise<Blob>;
  getPhotoCapabilities(): Promise<PhotoCapabilities>
  getPhotoSettings(): Promise<PhotoSettings>;
  grabFrame(): Promise<ImageBitmap>;
}