import type { Message } from '../models/deepseek';

export type Session = {
  id: string;
  userId: string;
  messages: Message[];
  running: boolean;
  seq: number;
};

const users = new Map<string, { id: string }>();
const sessions = new Map<string, Session>();

export const ensureUser = (userId: string) => {
  users.set(userId, { id: userId });
};

export function openSession(userId: string) {
  const id = crypto.randomUUID();
  sessions.set(id, { id, userId, messages: [], running: false, seq: 0 });
  return id;
}

export function getSession(userId: string, sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.userId !== userId) return 'forbidden' as const;
  return session;
}

export function listSessions(userId: string) {
  return [...sessions.values()]
    .filter((session) => session.userId === userId)
    .map((session) => {
      const first = session.messages.find(
        (message) =>
          message.role === 'user' && typeof message.content === 'string',
      );
      return {
        id: session.id,
        preview: typeof first?.content === 'string' ? first.content : '',
      };
    });
}

export function load(userId: string, sessionId: string) {
  const session = getSession(userId, sessionId);
  if (session === 'forbidden' || session === null) return session;
  return session.messages;
}

export function append(userId: string, sessionId: string, message: Message) {
  const session = getSession(userId, sessionId);
  if (session === 'forbidden' || session === null) return session;
  session.messages.push(message);
  return session;
}

export function nextSeq(session: Session) {
  session.seq += 1;
  return session.seq;
}

export function startSessionTurn(userId: string, sessionId?: string) {
  if (!sessionId) {
    const id = openSession(userId);
    const session = sessions.get(id);
    if (!session) return { ok: false as const, error: 'missing' as const };
    session.running = true;
    return { ok: true, session, created: true };
  }

  const session = getSession(userId, sessionId);

  if (session === 'forbidden')
    return { ok: false as const, error: 'forbidden' as const };
  if (session === null)
    return { ok: false as const, error: 'missing' as const };
  if (session.running) return { ok: false as const, error: 'busy' as const };

  return { ok: true, session, created: true };
}
