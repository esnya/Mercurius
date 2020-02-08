import React, { FunctionComponent } from 'react';
import { Switch, Route, RouteComponentProps } from 'react-router';
import { MenuItem, Menu } from 'semantic-ui-react';
import { Link } from 'react-router-dom';

function menuItemOf(
  path: string,
  content: string,
): FunctionComponent<RouteComponentProps<{ projectId: string }>> {
  return function ProjectMenuItem({
    match,
  }: RouteComponentProps<{ projectId: string }>): JSX.Element {
    const { projectId } = match.params;

    return (
      <MenuItem
        as={Link}
        to={path.replace(':projectId', projectId)}
        content={content}
      />
    );
  };
}

function ProjectMenuItem({
  path,
  content,
}: {
  path: string;
  content: string;
}): JSX.Element {
  return (
    <Switch>
      <Route
        path="/projects/:projectId"
        component={menuItemOf(path, content)}
      />
    </Switch>
  );
}

export default function AppMenu(): JSX.Element {
  return (
    <Menu pointing secondary>
      <MenuItem as={Link} to="/" content="ホーム" />
      <ProjectMenuItem path="/projects/:projectId" content="プロジェクト" />
      <ProjectMenuItem path="/projects/:projectId/members" content="メンバー" />
      <ProjectMenuItem path="/projects/:projectId/auto" content="自動入力" />
    </Menu>
  );
}
