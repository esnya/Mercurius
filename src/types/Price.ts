import firebase from 'firebase/app';

export default interface Price {
  price: number;
  lottery: boolean;
  timestamp: firebase.firestore.Timestamp;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPrice(value: any): value is Price {
  return (
    typeof value === 'object' &&
    typeof value.price === 'number' &&
    typeof value.lottery === 'boolean' &&
    value.timestamp instanceof firebase.firestore.Timestamp
  );
}
