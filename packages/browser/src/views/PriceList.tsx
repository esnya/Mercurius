import React from 'react';
import { map } from 'rxjs/operators';
import Price from 'mercurius-core/lib/models-next/Price';
import PriceSchema from 'mercurius-core/lib/models-next/Price.schema.json';
import firebase from 'firebase/app';
import { Table, Icon, Button, Container, Modal } from 'semantic-ui-react';
import { formatTimestamp, formatZeny } from '../utilities/format';
import zip from 'lodash/zip';
import {
  firebase$,
  waitUntilSignedIn,
  collection,
  querySnapshot,
} from '../operators/firebase';
import ObservableLoader from '../components/ObservableLoader';
import ActionButton from '../components/ActionButton';
import useObservable from '../hooks/useObservable';

export interface PriceListProps {
  projectId: string;
  itemId: string;
}

export default function PriceList({
  projectId,
  itemId,
}: PriceListProps): JSX.Element {
  const priceSnapshotState = useObservable(
    () =>
      firebase$.pipe(
        map(app => app.firestore()),
        waitUntilSignedIn(),
        collection(`projects/${projectId}/items/${itemId}/prices`, PriceSchema),
        map(prices => prices.orderBy('timestamp', 'desc').limit(100)),
        querySnapshot(),
      ),
    [projectId, itemId],
  );

  return (
    <ObservableLoader
      state={priceSnapshotState}
      render={(pricesSnapshot): JSX.Element => {
        const { docs: priceSnapshots } = pricesSnapshot;
        return (
          <Table
            headerRow={['Timestamp', 'Price', 'Lottery']}
            renderBodyRow={(
              priceSnapshot: firebase.firestore.QueryDocumentSnapshot<Price>,
            ): JSX.Element => {
              const data = priceSnapshot.data();
              const { timestamp, price, lottery } = data;

              return (
                <Table.Row key={priceSnapshot.ref.id}>
                  <Table.Cell>
                    <Button.Group basic compact floated="right" icon>
                      <Modal
                        trigger={<Button icon="delete" />}
                        actions={[
                          'キャンセル',
                          <ActionButton
                            color="red"
                            key="delete"
                            action={async (): Promise<void> => {
                              await priceSnapshot.ref.delete();
                              await priceSnapshot.ref.parent.parent?.update(
                                'updatedAt',
                                firebase.firestore.FieldValue.delete(),
                              );
                            }}
                            content="削除"
                          />,
                        ]}
                        header="本当に削除しますか？"
                        content={
                          <Container>
                            <Table
                              tableData={zip(
                                ['timestamp', 'price', 'lottery'],
                                [
                                  formatTimestamp,
                                  formatZeny,
                                  (a: unknown): string => `${a}`,
                                ],
                              )}
                              renderBodyRow={([key, format]: [
                                keyof Price,
                                (value: unknown) => string,
                              ]): JSX.Element => (
                                <Table.Row key={key}>
                                  <Table.Cell content={key} />
                                  <Table.Cell content={format(data[key])} />
                                </Table.Row>
                              )}
                            />
                          </Container>
                        }
                      />
                    </Button.Group>
                    {formatTimestamp(timestamp)}
                  </Table.Cell>
                  <Table.Cell content={formatZeny(price)} />
                  <Table.Cell
                    content={
                      lottery ? (
                        <Icon color="red" key="lottery" name="check" />
                      ) : null
                    }
                  />
                </Table.Row>
              );
            }}
            tableData={priceSnapshots}
          />
        );
      }}
    />
  );
}
