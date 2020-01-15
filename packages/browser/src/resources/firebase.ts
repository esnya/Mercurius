import PromiseReader from '../suspense/PromiseReader';
import { initializeFirestore } from '../firebase/firestore';

export const firestore = new PromiseReader(initializeFirestore);
