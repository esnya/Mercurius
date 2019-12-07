import React, { useState, ComponentType, useEffect } from 'react';
import {
  Modal,
  ModalHeader,
  ModalActions,
  ModalContent,
  Message,
  ButtonProps,
  Form,
  FormInput,
  Loader,
} from 'semantic-ui-react';
import firebase from 'firebase/app';
import ActionButton from '../components/ActionButton';
import { WithFirebaseProps } from './withFirebaseApp';
import UserProfile, { isUserProfile } from '../types/UserProfile';

export type User = firebase.User;

export interface WithUserProps extends WithFirebaseProps {
  user: User;
  profile: UserProfile;
  profileRef: firebase.firestore.DocumentReference;
}

function ProfileModal({
  onSubmit,
}: {
  onSubmit: (profile: UserProfile) => Promise<void>;
}): JSX.Element {
  const [profile, setProfile] = useState<Partial<UserProfile>>({});

  async function handleSubmit(): Promise<void> {
    if (!isUserProfile(profile)) return;
    await onSubmit(profile);
  }

  return (
    <Modal open>
      <ModalHeader>プロフィール登録</ModalHeader>
      <ModalContent>
        <Form onSubmit={handleSubmit}>
          <FormInput
            label="ユーザー名"
            value={profile.name}
            onChange={(_e, { value }): void =>
              setProfile(p => ({ ...p, name: `${value}` || undefined }))
            }
          />
        </Form>
      </ModalContent>
      <ModalActions>
        <ActionButton
          action={handleSubmit}
          disabled={!isUserProfile(profile)}
          color="blue"
        >
          登録
        </ActionButton>
      </ModalActions>
    </Modal>
  );
}

export default function withUser(
  Component: ComponentType<WithUserProps>,
  showSignInForm = false,
): ComponentType<WithFirebaseProps> {
  return function WithUser({ app }: WithFirebaseProps): JSX.Element | null {
    const auth = app.auth();

    const [user, setUser] = useState<firebase.User | null>(auth.currentUser);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      return auth.onAuthStateChanged((user): void => setUser(user));
    }, [app]);

    const firestore = app.firestore();
    const profileRef = user && firestore.collection('users').doc(user.uid);

    useEffect(() => {
      if (!profileRef) return;
      return profileRef.onSnapshot(snapshot => {
        const data = snapshot.data();
        setProfile(isUserProfile(data) ? data : null);
      });
    }, [profileRef]);

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

    if (!profileRef) {
      return <Loader />;
    }

    if (!profile) {
      return (
        <ProfileModal
          onSubmit={(profile: UserProfile): Promise<void> =>
            profileRef.set(profile)
          }
        />
      );
    }

    return (
      <Component
        app={app}
        user={user}
        profileRef={profileRef}
        profile={profile}
      />
    );
  };
}
