import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { login, userIdOf } from '../auth/tokens';
import { ensureUser, listSessions, startSessionTurn } from '../sessions/store';
import { runTurn } from '../sessions/turn';

type Env = { Variables: { userId: string } };

export const app = new Hono<Env>();

app.post('/login', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '请求体不是JSON' }, 400);
  }
  const userId =
    typeof body === 'object' && body !== null && 'userId' in body
      ? body.userId
      : undefined;
  if (typeof userId !== 'string' || userId.length === 0)
    return c.json({ error: `缺少userId` }, 400);
  const token = login(userId);
  console.log(`用户${userId}登录`);
  return c.json({ token, userId });
});

app.use('*', async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : null;
  const userId = token === null ? null : userIdOf(token);
  if (!userId) return c.json({ error: '未登录' }, 401);
  c.set('userId', userId);
  await next();
});

app.get('/sessions', (c) => {
  const userId = c.get('userId');
  const items = listSessions(userId);
  console.log();
  return c.json({ sessions: items });
});

// app.post('/messages', (c) => message)

async function messageTurn(c: Context<Env>, sessionId?: string) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '请求体不是JSON' }, 400);
  }

  const text =
    typeof body === 'object' && body !== null && 'text' in body
      ? body.text
      : undefined;
  if (typeof text !== 'string' || text.length === 0)
    return c.json({ error: `缺少text` }, 400);

  const userId = c.get('userId');
  const started = startSessionTurn(userId, sessionId);
  if (!started.ok) {
    if (started.error === 'forbidden') {
      console.log(`用户${userId} 拒绝会话访问 ${sessionId ?? ''}`);
      return c.json({ error: '这个会话不属于当前用户' }, 403);
    }
    if (started.error === 'busy') {
      return c.json({ error: '这一轮还没有结束' }, 409);
    }
    return c.json({ error: '没有这个会话' }, 404);
  }

  if (started.created)
    console.log(`用户${userId} 创建会话 ${started.session.id}`);
  console.log(`用户${userId} 会话 ${started.session.id} 收到消息 ${text}`);

  const id = started.session.id;

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: 'session',
      data: JSON.stringify({ sessionId: id }),
    });
    await runTurn(userId, id, text, (event, data) =>
      stream.writeSSE({ event, data: JSON.stringify(data) }),
    );
  });
}

export function listen(port = 3000) {
  serve({
    fetch: app.fetch,
    port,
    hostname: '127.0.0.1',
  });
  console.log(`http://127.0.0.1:${port}`);
}
