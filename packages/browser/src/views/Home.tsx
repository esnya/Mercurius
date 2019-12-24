import React, { useState } from 'react';
import withUser, { WithUserProps } from '../enhancers/withUser';
import withFirebaseApp from '../enhancers/withFirebaseApp';
import {
  Container,
  Form,
  FormInput,
  ItemGroup,
  Item,
  ItemHeader,
  Header,
  Divider,
} from 'semantic-ui-react';
import ActionButton from '../components/ActionButton';
import useAsyncEffect from '../hooks/useAsyncEffect';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  title: string;
  owner: string;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isProject(value: any): value is Project {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.owner === 'string'
  );
}

export default withFirebaseApp(
  withUser(function Home({
    app,
    user,
    profile,
    profileRef,
  }: WithUserProps): JSX.Element {
    const [name, setName] = useState(profile.name);

    const [projects, setProjects] = useState<Project[]>();

    useAsyncEffect(async () => {
      const projectsRef = app.firestore().collection('projects');
      const snapshot = await projectsRef.get();
      const projects = await Promise.all(
        snapshot.docs.map(async doc => {
          try {
            const project = {
              ...doc.data(),
              id: doc.ref.id,
            };

            if (doc.get('owner') === user.uid) return project;

            const memberSnapshot = await doc.ref
              .collection('members')
              .doc(user.uid)
              .get();
            if (!memberSnapshot.get('read')) return null;

            return project;
          } catch {
            return null;
          }
        }),
      );
      setProjects(projects.filter(a => a).filter(isProject));
    }, [user.uid]);

    const items =
      projects &&
      projects.map(({ id, title }) => (
        <Item key={id}>
          <ItemHeader as={Link} to={`/projects/${id}`}>
            {title}
          </ItemHeader>
        </Item>
      ));

    return (
      <div>
        <Container text>
          <Header dividing>プロフィール</Header>
          <Form>
            <FormInput label="ユーザーID" readOnly value={user.uid} />
            <FormInput
              label="ユーザー名"
              value={name}
              onChange={(_e, { value }): void => setName(value)}
            />
            <ActionButton
              action={async (): Promise<void> => {
                if (!name) return;
                await profileRef.update('name', name);
              }}
              color="blue"
              disabled={!name || name === profile.name}
            >
              更新
            </ActionButton>
            <ActionButton action={(): Promise<void> => app.auth().signOut()}>
              サインアウト
            </ActionButton>
          </Form>
        </Container>
        <Divider hidden />
        <Container text>
          <Header dividing>プロジェクト</Header>
          <ItemGroup>{items}</ItemGroup>
        </Container>
      </div>
    );
  },
  true),
);
