import React from 'react';
import ActionButton from './ActionButton';
import withFirebaseApp from '../enhancers/withFirebaseApp';

export default withFirebaseApp(function SignOutButton({ app }): JSX.Element {
  const { signOut } = app.auth();
  return (
    <ActionButton
      action={async (): Promise<void> => {
        try {
          await signOut();
        } finally {
          location.reload();
        }
      }}
    >
      サインアウト
    </ActionButton>
  );
});
