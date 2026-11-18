import { replay } from '../agents/tool-agent';
import { append, getSession, load, nextSeq } from './store';

export async function runTurn(
  userId: string,
  sessionId: string,
  text: string,
  send: (event: string, data: unknown) => void | Promise<void>,
) {
  const session = getSession(userId, sessionId);
  if (session === 'forbidden' || session === null) return;
  append(userId, sessionId, { role: 'user', content: text });
  const histories = load(userId, sessionId);
  if (histories === 'forbidden' || histories === null) {
    session.running = false;
    return;
  }

  try {
    const answer = await replay(histories, (delta) => {
      void send('token', { seq: nextSeq(session), text: delta });
    });
    append(userId, sessionId, { role: 'assistant', content: answer });
    await send('done', { seq: nextSeq(session), text: answer });
    console.log(`用户 ${userId} 会话 ${sessionId} 本轮结束`);
  } catch (error) {
    const message = error instanceof Error ? error.message : '本轮失败';
    await send('error', { seq: nextSeq(session), message });
    console.log(`用户 ${userId} 会话 ${sessionId} 本轮失败 ${message}`);
  } finally {
    session.running = false;
  }
}
