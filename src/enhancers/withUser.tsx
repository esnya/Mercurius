import React, { useState, ComponentType, useEffect } from 'react';
import {
  Modal,
  ModalHeader,
  ModalActions,
  ModalContent,
  Message,
  ButtonProps,
} from 'semantic-ui-react';
import firebase from 'firebase/app';
import ActionButton from '../components/ActionButton';
import { WithFirebaseProps } from './withFirebaseApp';

export type User = firebase.User;

export interface WithUserProps extends WithFirebaseProps {
  user: User;
}

export default function withUser(
  Component: ComponentType<WithUserProps>,
  showSignInForm = false,
): ComponentType<WithFirebaseProps> {
  return function WithUser({ app }: WithFirebaseProps): JSX.Element | null {
    const auth = app.auth();

    const [user, setUser] = useState<firebase.User | null>(auth.currentUser);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      return auth.onAuthStateChanged((user): void => setUser(user));
    }, [app]);

    if (!user) {
      if (!showSignInForm) return null;

      const errorMessage = error && (
        <ModalContent>
          <Message negative>{error.message}</Message>
        </ModalContent>
      );

      const authProviders: {
        color: Exclude<ButtonProps['color'], undefined>;
        provider: firebase.auth.AuthProvider;
        text: string;
      }[] = [
        {
          color: 'red',
          provider: new firebase.auth.GoogleAuthProvider(),
          text: 'Google',
        },
        {
          color: 'twitter',
          provider: new firebase.auth.TwitterAuthProvider(),
          text: 'Twitter',
        },
      ];

      const signInButtons = authProviders.map(
        ({ color, provider, text }, i) => (
          <ActionButton
            key={i}
            color={color}
            action={(): Promise<void> =>
              auth.signInWithPopup(provider).then(
                ({ user }): void => setUser(user),
                (error): void => {
                  console.error(error);
                  setError(error);
                },
              )
            }
          >
            {text}
          </ActionButton>
        ),
      );

      return (
        <Modal open>
          <ModalHeader>サインイン</ModalHeader>
          {errorMessage}
          <ModalActions>{signInButtons}</ModalActions>
        </Modal>
      );
    }

    return <Component app={app} user={user} />;
  };
}
