import { initializeApp } from '../firebase';
import useAsyncSimple from './useAsyncSimple';

const appPromise = initializeApp();

export default function useFirebase(): firebase.app.App | Error | undefined {
  return useAsyncSimple(appPromise);
}
