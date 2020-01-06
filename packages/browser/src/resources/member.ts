import { getProjectPath } from './project';
import { Snapshot, cast } from '../firebase/snapshot';
import {
  ProjectMember,
  ProjectMemberConverter,
} from 'mercurius-core/lib/models/ProjectMember';
import { doc } from '../firebase/firestore';

export function getMemberCollectionPath(projectId: string): string {
  return `${getProjectPath(projectId)}/members`;
}

export function getMemberPath(projectId: string, uid: string): string {
  return `${getMemberCollectionPath(projectId)}/${uid}`;
}

export async function getMember(
  projectId: string,
  uid: string,
): Promise<Snapshot<ProjectMember>> {
  const memberRef = await doc(getMemberPath(projectId, uid));
  return cast(await memberRef.get(), ProjectMemberConverter.cast);
}
