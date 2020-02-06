import MercuriusFirestore, {
  FirestoreLike,
} from 'mercurius-core/lib/firestore/mercurius';
import { Firestore, FieldValue } from '@google-cloud/firestore';

export default new MercuriusFirestore(
  new Firestore() as FirestoreLike,
  FieldValue,
);
