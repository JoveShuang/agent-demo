import { ensureUser } from '../sessions/store';

const tokens = new Map<string, string>();

export function login(userId: string) {
  ensureUser(userId);
  const token = crypto.randomUUID();
  tokens.set(token, userId);
  return token;
}

export function userIdOf(token: string) {
  return tokens.get(token) ?? null;
}
