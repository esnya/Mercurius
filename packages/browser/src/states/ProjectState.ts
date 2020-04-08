import firebase from 'firebase/app';
import { observable, action, computed, reaction } from 'mobx';
import FirebaseState from './FirebaseState';
import { schemaConverter } from '../firebase/converters';
import Project from 'mercurius-core/lib/models-next/Project';
import ProjectSchema from 'mercurius-core/lib/models-next/Project.schema.json';
import { Unsubscribe } from 'firebase';
import Item from 'mercurius-core/lib/models-next/Item';
import ItemSchema from 'mercurius-core/lib/models-next/Item.schema.json';
import { replaceTimestamps } from '../utilities/path';
import { DateTime } from 'luxon';

export interface SearchParams {
  activePage: number;
  sortBy: string;
  sortOrder: firebase.firestore.OrderByDirection;
  keywords?: string[];
}

const searchKeys: (keyof SearchParams)[] = [
  'sortBy',
  'sortOrder',
  'keywords',
  'activePage',
];

export default class ProjectState {
  private unsubscribeItemQuery?: Unsubscribe;

  constructor(readonly firebase: FirebaseState, readonly projectId: string) {
    searchKeys.forEach(<K extends keyof SearchParams>(key: K): void => {
      const storageKey = `project:items:${key}`;
      reaction(
        () => this[key],
        (value): void => {
          localStorage.setItem(storageKey, JSON.stringify(value));
        },
      );
      const parsed = localStorage.getItem(storageKey) as string | undefined;
      if (parsed) {
        try {
          this[key] = JSON.parse(parsed) as this[K];
        } catch (e) {
          console.error(e);
        }
      }
    });

    reaction(
      () => this.itemQuery,
      (query): void => {
        if (this.unsubscribeItemQuery) {
          this.unsubscribeItemQuery();
        }

        this.unsubscribeItemQuery = query.onSnapshot((snapshot): void => {
          this.itemQuerySnapshot = snapshot;
        });
      },
      {
        fireImmediately: true,
      },
    );

    setInterval(() => {
      this.now = Date.now();
    }, 1000 * 60 * 15);
  }

  readonly projectCollection = this.firebase.firestore
    .collection('projects')
    .withConverter(schemaConverter<Project>(ProjectSchema));
  readonly projectReference = this.projectCollection.doc(this.projectId);

  @observable
  projectData?: Project;

  @observable
  projectLoading?: Promise<void>;

  @action
  subscribeProject(): Unsubscribe {
    const onNext = (
      snapshot: firebase.firestore.DocumentSnapshot<Project>,
    ): void => {
      this.projectData = snapshot.data();
    };

    this.projectLoading = this.projectReference.get().then(onNext);

    return this.projectReference.onSnapshot(onNext);
  }

  readonly itemCollection = this.projectReference
    .collection('items')
    .withConverter(schemaConverter<Item>(ItemSchema));

  @observable sortBy = 'name';
  @observable sortOrder: firebase.firestore.OrderByDirection = 'asc';
  @observable activePage = 1;
  @observable keywords?: string[];

  @observable now = Date.now();

  @computed get sortByReplaced(): string {
    return replaceTimestamps(this.sortBy, DateTime.fromMillis(this.now));
  }

  @computed
  get itemQuery(): firebase.firestore.Query<Item> {
    return this.itemCollection.orderBy(this.sortByReplaced, this.sortOrder);
  }

  @observable
  private itemQuerySnapshot?: firebase.firestore.QuerySnapshot<Item>;

  @computed
  get itemQuerySnapshots():
    | firebase.firestore.QueryDocumentSnapshot<Item>[]
    | undefined {
    if (!this.itemQuerySnapshot) {
      return;
    }

    const { docs } = this.itemQuerySnapshot;

    const { keywords } = this;
    if (!keywords) {
      return docs;
    }

    return this.itemQuerySnapshot.docs.filter(doc => {
      const { name } = doc.data();
      return keywords.find(keyword => name.match(keyword)) !== undefined;
    });
  }
}
