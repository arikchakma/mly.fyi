import { customAlphabet } from 'nanoid';
import { v4 as uuidV4 } from 'uuid';
export const nanoid = customAlphabet(
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
);

const prefixes = {
  key: 'key',
  user: 'user',
  project: 'pjt',
  projectMember: 'pjm',
  projectIdentity: 'pji',
  projectStats: 'pjs',
  configurationSet: 'cfg',
  emailLog: 'eml',
  emailLogEvent: 'eme',
  test: 'test', // <-- for tests only
} as const;

export function newId(prefix: keyof typeof prefixes): string {
  return [prefixes[prefix], nanoid(16)].join('_');
}

const API_KEY_PREFIX = 'mly';
export function newApiKey(): string {
  return [API_KEY_PREFIX, uuidV4().replaceAll('-', '')].join('_');
}
