const Loading = Symbol('Loading');

export default class PromiseReader<T> {
  constructor(promise: Promise<T> | (() => Promise<T>)) {
    this.promise = (typeof promise === 'function' ? promise() : promise).then(
      (result): void => {
        this.result = result;
      },
      (error: Error): void => {
        this.error = error;
      },
    );
  }

  private readonly promise: Promise<void>;
  private result: T | typeof Loading = Loading;
  private error?: Error;

  read(): T {
    if (this.error) {
      throw this.error;
    }

    if (this.result === Loading) {
      throw this.promise;
    }

    return this.result;
  }
}
