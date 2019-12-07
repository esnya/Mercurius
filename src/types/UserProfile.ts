export default interface UserProfile {
  name: string;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isUserProfile(value: any): value is UserProfile {
  return typeof value === 'object' && typeof value.name === 'string';
}
