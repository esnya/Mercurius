import React, { useState, ComponentType, useEffect } from 'react';
import { Loader, Message } from 'semantic-ui-react';
import { initializeApp } from '../firebase';

export type App = firebase.app.App;

export interface WithFirebaseProps {
  app: App;
}

export default function withFirebaseApp(
  Component: ComponentType<WithFirebaseProps>,
  name?: string,
): ComponentType {
  return function WithFirebaseApp(): JSX.Element {
    const [app, setApp] = useState<App>();
    const [error, setError] = useState<Error>();
    const [started, setStarted] = useState(false);

    useEffect(() => {
      if (started) return;
      setStarted(true);

      initializeApp(name).then(setApp, setError);
    });

    if (error) {
      return <Message negative>{error.toString()}</Message>;
    }

    if (!app) {
      return <Loader />;
    }

    return <Component app={app} />;
  };
}
