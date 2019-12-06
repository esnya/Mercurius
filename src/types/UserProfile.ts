export default interface UserProfile {
  name: string;
}
export function isUserProfile(value: any): value is UserProfile {
  return typeof value === 'object' && typeof value.name === 'string';
}
