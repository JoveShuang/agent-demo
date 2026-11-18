import { callModel, type Message } from '../models/deepseek';
import { SYSTEM_PROMPT } from '../prompts/system';
import { runTool, tools } from '../tools';

export async function replay(
  histories: Message[],
  onDelta?: (text: string) => void,
) {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...histories,
  ];

  while (true) {
    const { message } = await callModel(messages, tools, onDelta);
    messages.push(message);
    if (!message.tool_calls?.length) return message.content ?? '';

    for (const call of message.tool_calls) {
      if (call.type !== 'function') continue;
      const args = JSON.parse(call.function.arguments);
      const result = await runTool(call.function.name, args);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }
}
