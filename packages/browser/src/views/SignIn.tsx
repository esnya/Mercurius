import React, { Suspense, useEffect } from 'react';
import { Container, Placeholder, ButtonProps } from 'semantic-ui-react';
import firebase from 'firebase/app';
import { initializeAuth } from '../firebase/auth';
import PromiseReader from '../suspense/PromiseReader';
import ActionButton from '../components/ActionButton';
import { useHistory } from 'react-router-dom';

const resource = {
  auth: new PromiseReader(initializeAuth()),
};

function SingInButton({
  provider,
  children,
  ...others
}: ButtonProps & {
  provider: firebase.auth.AuthProvider;
}): JSX.Element {
  const auth = resource.auth.read();
  const history = useHistory();

  useEffect(() =>
    auth.onAuthStateChanged(user => {
      if (user) {
        history.push('/');
      }
    }),
  );

  return (
    <ActionButton
      {...others}
      action={async (): Promise<void> => {
        await auth.signInWithPopup(provider);
      }}
    >
      {children}
    </ActionButton>
  );
}

export default function SignIn(): JSX.Element {
  return (
    <Container>
      <Suspense
        fallback={
          <Placeholder>
            <Placeholder.Image />
          </Placeholder>
        }
      >
        <SingInButton
          color="twitter"
          provider={new firebase.auth.TwitterAuthProvider()}
        >
          Twitter
        </SingInButton>
        <SingInButton
          color="google plus"
          provider={new firebase.auth.GoogleAuthProvider()}
        >
          Google
        </SingInButton>
      </Suspense>
    </Container>
  );
}
