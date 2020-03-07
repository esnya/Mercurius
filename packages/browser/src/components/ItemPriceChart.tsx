import React from 'react';
import Item from 'mercurius-core/lib/models-next/Item';
import { Placeholder, Image } from 'semantic-ui-react';

export default function ItemPriceChart({
  itemSnapshot,
}: {
  itemSnapshot: firebase.firestore.QueryDocumentSnapshot<Item>;
}): JSX.Element {
  const { chartUrl } = itemSnapshot.data();

  if (!chartUrl) {
    return <Placeholder.Image />;
  }

  return <Image src={chartUrl} />;
}
