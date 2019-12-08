import React, { useState, useEffect } from 'react';
import withFirebaseApp, {
  WithFirebaseProps,
} from '../../enhancers/withFirebaseApp';
import { useParams } from 'react-router';
import {
  Loader,
  Container,
  TableHeader,
  TableRow,
  TableHeaderCell,
  Table,
  TableBody,
  TableCell,
  Checkbox,
  Icon,
  FormInput,
  FormCheckbox,
  Form,
  Segment,
} from 'semantic-ui-react';
import useAsyncEffect from '../../hooks/useAsyncEffect';
import ActionButton from '../../components/ActionButton';

type CollectionReference = firebase.firestore.CollectionReference;
type DocumentSnapshot = firebase.firestore.DocumentSnapshot;
type QuerySnapshot = firebase.firestore.QuerySnapshot;

function AddForm({
  membersRef,
}: {
  membersRef: CollectionReference;
}): JSX.Element {
  const [uid, setUid] = useState<string | null>();
  const [read, setRead] = useState(true);
  const [write, setWrite] = useState(false);

  const isValid = Boolean(uid);

  const onSubmit = async (): Promise<void> => {
    if (!isValid || !uid) return;

    await membersRef.doc(uid).set({ read, write });

    setUid(null);
    setRead(true);
    setWrite(false);
  };

  return (
    <Form onSubmit={onSubmit}>
      <FormInput
        required
        label="ユーザーID"
        value={uid}
        onChange={(_e, { value }): void => setUid(value)}
      />
      <FormCheckbox
        label="読み取り"
        checked={read}
        onChange={(): void => setRead(!read)}
      />
      <FormCheckbox
        label="書き込み"
        checked={write}
        onChange={(): void => setWrite(!write)}
      />
      <ActionButton color="blue" disabled={!isValid} action={onSubmit}>
        追加
      </ActionButton>
    </Form>
  );
}

export default withFirebaseApp(function Members({
  app,
}: WithFirebaseProps): JSX.Element {
  const { projectId } = useParams();

  const firestore = app.firestore();
  const projectRef = firestore.collection('projects').doc(projectId);
  const membersRef = projectRef.collection('members');
  const usersRef = firestore.collection('users');

  const [project, setProject] = useState<DocumentSnapshot>();
  const [members, setMembers] = useState<QuerySnapshot>();
  const [users, setUsers] = useState<Record<string, DocumentSnapshot>>({});
  const [owner, setOwner] = useState<DocumentSnapshot>();

  useAsyncEffect(async (): Promise<void> => {
    if (!projectId) return;

    const project = await projectRef.get();
    setProject(project);

    const owner = await usersRef.doc(project.get('owner')).get();
    setOwner(owner);
  }, [app, projectId]);

  useEffect((): void | (() => void) => {
    if (!projectId) return;
    return membersRef.onSnapshot(setMembers);
  }, [app, projectId]);

  useAsyncEffect(async (): Promise<void> => {
    if (!members) return;
    await Promise.all(
      members.docs.map(
        async (member): Promise<void> => {
          const uid = member.ref.id;
          if (uid in users) return;

          const user = await usersRef.doc(uid).get();
          setUsers(users => ({
            ...users,
            [uid]: user,
          }));
        },
      ),
    );
  }, [app, members]);

  if (!members || !project) return <Loader />;

  const rows = members.docs.map(member => {
    const uid = member.ref.id;
    const user = users[uid];

    const read = Boolean(member.get('read'));
    const write = Boolean(member.get('write'));
    return (
      <TableRow key={uid}>
        <TableCell>{user && user.get('name')}</TableCell>
        <TableCell>{uid}</TableCell>
        <TableCell textAlign="center">
          <Checkbox
            checked={read}
            onChange={async (): Promise<void> =>
              member.ref.update('read', !read)
            }
          />
        </TableCell>
        <TableCell textAlign="center">
          <Checkbox
            checked={write}
            onChange={async (): Promise<void> =>
              member.ref.update('write', !write)
            }
          />
        </TableCell>
        <TableCell textAlign="center">
          <ActionButton
            icon
            color="red"
            action={(): Promise<void> => member.ref.delete()}
          >
            <Icon size="small" name="user delete" />
          </ActionButton>
        </TableCell>
      </TableRow>
    );
  });

  return (
    <Container>
      <Segment>
        <AddForm membersRef={membersRef} />
      </Segment>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>ユーザー名</TableHeaderCell>
            <TableHeaderCell>ユーザーID</TableHeaderCell>
            <TableHeaderCell>読み取り</TableHeaderCell>
            <TableHeaderCell>書き込み</TableHeaderCell>
            <TableHeaderCell></TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>{owner && owner.get('name')}</TableCell>
            <TableCell>{project.get('owner')}</TableCell>
            <TableCell textAlign="center">
              <Icon name="chess queen" />
            </TableCell>
            <TableCell textAlign="center">
              <Icon name="chess queen" />
            </TableCell>
          </TableRow>
          {rows}
        </TableBody>
      </Table>
    </Container>
  );
});
