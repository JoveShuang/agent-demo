import { callModel, type Message } from '../models/deepseek';
import { SYSTEM_PROMPT } from '../prompts/system';

export async function replay(question: string, histories: Message[]) {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...histories,
  ];

  const answer = await callModel(messages);
  return answer.content ?? '';
}
