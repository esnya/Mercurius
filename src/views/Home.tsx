import React, { useState } from 'react';
import _ from 'lodash';
import withUser, { WithUserProps } from '../enhancers/withUser';
import withFirebaseApp from '../enhancers/withFirebaseApp';
import { Container, Segment, Form, FormInput } from 'semantic-ui-react';
import ActionButton from '../components/ActionButton';

export default withFirebaseApp<{}>(
  withUser<{}>(function Home({
    user,
    profile,
    profileRef,
  }: WithUserProps): JSX.Element {
    const [name, setName] = useState(profile.name);

    return (
      <Container>
        <Segment>
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
          </Form>
        </Segment>
      </Container>
    );
  },
  true),
);
