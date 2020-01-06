import { Snapshot, cast } from '../firebase/snapshot';
import {
  UserProfile,
  UserProfileConverter,
} from 'mercurius-core/lib/models/UserProfile';
import { doc } from '../firebase/firestore';
import { getCurrentUser } from '../firebase/auth';

export const userProfileCollection = 'users';

export function getUserProfilePath(uid: string): string {
  return `${userProfileCollection}/${uid}`;
}

export async function getUserProfile(
  uid: string,
): Promise<Snapshot<UserProfile>> {
  const profileRef = await doc(getUserProfilePath(uid));
  return cast(await profileRef.get(), UserProfileConverter.cast);
}

export async function getCurrentUserProfile(): Promise<Snapshot<UserProfile>> {
  const { uid } = await await getCurrentUser();
  return await getUserProfile(uid);
}

export async function setCurrentUserProfile(
  profile: UserProfile,
): Promise<void> {
  const { uid } = await getCurrentUser();
  const profileRef = await doc(getUserProfilePath(uid));
  await profileRef.update(profile);
}
