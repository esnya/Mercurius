import React, { useState, ComponentType, useEffect } from 'react';
import { Loader, Message } from 'semantic-ui-react';
import { initializeApp } from '../firebase';

export type App = firebase.app.App;

export interface WithFirebaseProps {
  app: App;
}

export default function withFirebaseApp<T = {}>(
  Component: ComponentType<WithFirebaseProps & T>,
  name?: string,
): ComponentType<T> {
  return function WithFirebaseApp(props: T): JSX.Element {
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

    return <Component app={app} {...props} />;
  };
}
