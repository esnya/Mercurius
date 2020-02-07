import {
  Firestore,
  CollectionReference,
  FieldValueClass,
  DocumentReference,
} from './types';
import Project from '../models-next/Project';
import Item from '../models-next/Item';
import Price from '../models-next/Price';
import pick from 'lodash/pick';
import fromPairs from 'lodash/fromPairs';
import ProjectSchema from '../../lib/models-next/Project.schema.json';
import ItemSchema from '../../lib/models-next/Item.schema.json';
import PriceSchema from '../../lib/models-next/Price.schema.json';
import { schemaConverter, DataConverterError } from './converter';

export type FirestoreLike = Firestore;

export default class MercuriusFirestore {
  constructor(
    readonly firestore: Firestore,
    readonly fieldValueClass: FieldValueClass,
  ) {}

  readonly converters = {
    project: schemaConverter<Project>(
      ProjectSchema,
      this.fieldValueClass,
      (decoded, validate): Project => {
        const data = {
          owner: 'unknown',
          ...pick(decoded, 'title', 'owner'),
        };
        if (!validate(data)) {
          throw new DataConverterError(validate.errors);
        }
        return data;
      },
    ),
    item: schemaConverter<Item>(
      ItemSchema,
      this.fieldValueClass,
      (decoded, validate): Item => {
        const { name, indices } = decoded;
        const data = {
          name,
          indices: Array.isArray(indices)
            ? fromPairs(indices.map(i => [`${i.timestamp}`, i]))
            : typeof indices === 'object'
            ? indices
            : undefined,
        };
        if (!validate(data)) {
          throw new DataConverterError(validate.errors);
        }
        return data;
      },
    ),
    price: schemaConverter<Price>(PriceSchema, this.fieldValueClass),
    // user: schemaConverter<User>(UserSchema, this.fieldValueClass),
  };

  get projectCollection(): CollectionReference<Project> {
    return this.firestore
      .collection('projects')
      .withConverter(this.converters.project);
  }

  getProjectReference(id: string): DocumentReference<Project> {
    return this.projectCollection.doc(id);
  }

  getItemCollection(
    projectRef: DocumentReference<Project>,
  ): CollectionReference<Item> {
    return projectRef.collection('items').withConverter(this.converters.item);
  }

  getPriceCollection(
    itemRef: DocumentReference<Item>,
  ): CollectionReference<Price> {
    return itemRef.collection('prices').withConverter(this.converters.price);
  }
}
