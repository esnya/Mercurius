import firebase from 'firebase-admin';
import { schemaConverter } from 'mercurius-core/lib/firestore/converter';
import Item from 'mercurius-core/lib/models-next/Item';
import ItemSchema from 'mercurius-core/lib/models-next/Item.schema.json';
import PriceSchema from 'mercurius-core/lib/models-next/Price.schema.json';
import Price from 'mercurius-core/lib/models-next/Price';

export const itemConverter = schemaConverter<Item>(
  ItemSchema,
  firebase.firestore.FieldValue,
);
export const priceConverter = schemaConverter<Price>(
  PriceSchema,
  firebase.firestore.FieldValue,
);
