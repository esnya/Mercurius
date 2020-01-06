import {
  Snapshot,
  cast,
  NonEmptySnapshot,
  castQuery,
  isExists,
} from '../firebase/snapshot';
import { Project, ProjectConverter } from 'mercurius-core/lib/models/Project';
import { all } from '../utilities/promise';
import { getCurrentUser } from '../firebase/auth';
import { collection, doc } from '../firebase/firestore';
import { getMember } from './member';
import { isDefined } from '../utilities/types';

export const projectCollection = 'projects';

export function getProjectPath(projectId: string): string {
  return `${projectCollection}/${projectId}`;
}

export async function getProject(
  projectId: string,
): Promise<Snapshot<Project>> {
  const projectRef = await doc(getProjectPath(projectId));
  return cast(await projectRef.get(), ProjectConverter.cast);
}

export async function listProjects(): Promise<NonEmptySnapshot<Project>[]> {
  const projectsRef = await collection(projectCollection);
  return castQuery(await projectsRef.get(), ProjectConverter.cast);
}

export async function listReadableProjects(): Promise<
  NonEmptySnapshot<Project>[]
> {
  const [user, projects] = await all(getCurrentUser(), listProjects());

  return (
    await all(
      ...projects.map(
        async (snapshot): Promise<NonEmptySnapshot<Project> | null> => {
          if (!user) return null;

          if (snapshot.data.owner === user.uid) {
            return snapshot;
          }

          const memberSnapshot = await getMember(snapshot.ref.id, user.uid);
          if (!isExists(memberSnapshot)) return null;

          return memberSnapshot.data.read ? snapshot : null;
        },
      ),
    )
  ).filter(isDefined);
}
