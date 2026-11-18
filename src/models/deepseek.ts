import dotenv from 'dotenv';
import path from 'path';
const envPath = path.resolve('.env');
dotenv.config({ path: envPath });

import OpenAI from 'openai';
import { logLine } from '../utils/logger';

interface PendingToolCall {
  id: string;
  type?: 'function' | 'custom';
  function: {
    name: string;
    arguments: string; // 持续拼接的字符串
  };
}

declare module 'openai/resources/chat/completions/completions' {
  interface ChatCompletionCreateParamsBase {
    thinking?: { type: 'enabled' | 'disabled' };
  }
}

export type Message = OpenAI.Chat.ChatCompletionMessageParam;
export type ToolDefinition = OpenAI.Chat.ChatCompletionFunctionTool;

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.BASE_URL,
});

export async function callModel(
  messages: Message[],
  tools?: ToolDefinition[],
  onDelta?: (text: string) => void,
) {
  const request = {
    model: 'deepseek-flash',
    messages,
    tools,
    thinking: { type: 'disabled' as const },
    stream: true as const,
    stream_options: { include_usage: true },
  };
  logLine(JSON.stringify(request));
  const stream = await client.chat.completions.create(request);

  let currentFullContent = '';
  let usage: OpenAI.CompletionUsage | null = null;
  const pendingToolCall: PendingToolCall[] = [];
  let finishReason: string | null = null;

  for await (const streamContent of stream) {
    const currentDelta = streamContent.choices[0]?.delta;
    if (!currentDelta) continue;

    if (currentDelta.content) {
      currentFullContent += currentDelta.content;
      onDelta?.(currentDelta.content);
    }

    if (streamContent.usage) {
      usage = streamContent.usage;
    }
    finishReason = streamContent.choices[0]?.finish_reason;

    if (currentDelta.tool_calls && currentDelta.tool_calls.length > 0) {
      for (const deltaTool of currentDelta.tool_calls) {
        const idx = deltaTool.index;
        // 如果还没这个index缓存，新建一条
        if (!pendingToolCall[idx]) {
          pendingToolCall[idx] = {
            id: deltaTool.id || '',
            type: deltaTool.type,
            function: {
              name: deltaTool.function?.name || '',
              arguments: '',
            },
          };
        }

        const target = pendingToolCall[idx];
        //增量覆盖id/name （只会在第一个分片出现）
        if (deltaTool.id) target.id = deltaTool.id;
        if (deltaTool.function?.name)
          target.function.name = deltaTool.function.name;
        if (deltaTool.function?.arguments) {
          target.function.arguments += deltaTool.function.arguments;
          logLine(deltaTool.function.arguments);
        }
      }
    }
  }

  console.log('\n==== 流结束 ====');
  console.log('finish_reason:', finishReason);
  console.log(
    `[输入${usage?.prompt_tokens}个 token  输出${usage?.completion_tokens} 个 token]`,
  );

  // 返回的时候就要拼好整个结果对象
  const message = {
    role: 'assistant' as const,
    content: currentFullContent || null,
    tool_calls: pendingToolCall.length
      ? pendingToolCall.map((cft) => ({
          id: cft.id,
          type: 'function' as const,
          function: {
            name: cft.function.name,
            arguments: cft.function.arguments,
          },
        }))
      : undefined,
  };
  return { message, finishReason };
}
