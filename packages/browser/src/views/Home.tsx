import React, { Suspense, useEffect } from 'react';
import {
  Container,
  Form,
  FormInput,
  ItemGroup,
  Item,
  ItemHeader,
  Header,
  Divider,
  Placeholder,
  Icon,
} from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import PromiseReader from '../suspense/PromiseReader';
import { getCurrentUser, signOut } from '../firebase/auth';
import { listReadableProjects } from '../resources/project';
import {
  getCurrentUserProfile,
  setCurrentUserProfile,
} from '../resources/profile';
import { assertIsExists } from '../utilities/assert';
import ActionButton from '../components/ActionButton';

const resource = {
  user: new PromiseReader(getCurrentUser()),
  profile: new PromiseReader(getCurrentUserProfile()),
  projects: new PromiseReader(listReadableProjects()),
};

function ProjectList(): JSX.Element {
  const itemElements = resource.projects.read().map(snapshot => (
    <Item key={snapshot.ref.id}>
      <ItemHeader as={Link} to={`/projects/${snapshot.ref.id}`}>
        {snapshot.data.title}
      </ItemHeader>
    </Item>
  ));

  return <ItemGroup>{itemElements}</ItemGroup>;
}

function UserForm(): JSX.Element {
  const { uid } = resource.user.read();
  const profile = resource.profile.read();
  assertIsExists(profile);

  const handleChange = (_e: unknown, { value }: { value: string }): void => {
    setCurrentUserProfile({ name: value });
  };

  return (
    <Form>
      <FormInput name="uid" label="ユーザーID" readOnly value={uid} />
      <FormInput
        name="username"
        label="ユーザー名"
        required
        value={profile.data.name}
        onChange={handleChange}
      />
    </Form>
  );
}

export default function Home(): JSX.Element {
  useEffect(() => {
    try {
      resource.user.read();
    } catch (_error) {
      location.href = '/sign-in';
    }
  });
  const fallback = (): JSX.Element => (
    <Placeholder>
      <Placeholder.Header />
    </Placeholder>
  );

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    location.reload();
  };

  return (
    <div>
      <Suspense fallback={fallback()}>
        <Container text>
          <Header dividing>プロフィール</Header>
          <UserForm />
        </Container>
        <Container text>
          <ActionButton action={handleSignOut} color="blue">
            <Icon name="sign out" />
            サインアウト
          </ActionButton>
        </Container>
        <Divider hidden />
        <Container text>
          <Header dividing>プロジェクト</Header>
          <Suspense fallback={fallback()}>
            <ProjectList />
          </Suspense>
        </Container>
      </Suspense>
    </div>
  );
}
