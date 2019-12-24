import React from 'react';
import {
  Container,
  Message,
  MessageHeader,
  MessageContent,
} from 'semantic-ui-react';
import { useLocation } from 'react-router';

export default function NotFound(): JSX.Element {
  const location = useLocation();
  return (
    <Container>
      <Message negative>
        <MessageHeader>404 NotFound</MessageHeader>
        <MessageContent>
          <p>There is no contents in: {location.pathname}</p>
        </MessageContent>
      </Message>
    </Container>
  );
}
