import { customAlphabet } from 'nanoid';
export const nanoid = customAlphabet(
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
);

const prefixes = {
  key: 'key',
  user: 'user',
  project: 'pjt',
  projectMember: 'pjm',
  projectIdentity: 'pji',
  configurationSet: 'cfg',
  emailLog: 'eml',
  emailEvent: 'eme',
  test: 'test', // <-- for tests only
} as const;

export function newId(prefix: keyof typeof prefixes): string {
  return [prefixes[prefix], nanoid(16)].join('_');
}
