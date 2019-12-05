import Notice from '../assets/decision22.mp3';
import Succeeded from '../assets/decision24.mp3';
import Failed from '../assets/warning1.mp3';

export default class Sound {
  constructor(url: string) {
    this.audio = document.createElement('audio');
    this.audio.src = url;
    this.audio.preload = 'preload';
    this.audio.loop = false;
  }

  play(): Promise<void> {
    this.audio.pause();
    this.audio.currentTime = 0;
    return this.audio.play();
  }

  readonly audio: HTMLAudioElement;
}

export const notice = new Sound(Notice);
export const succeeded = new Sound(Succeeded);
export const failed = new Sound(Failed);
