import readline from 'node:readline/promises';
import { replay } from './agents/tool-agent';
import { logLine } from './utils/logger';
import { memory } from './memory/full-history';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let round = 0;

console.log('你好');

while (true) {
  const input = await rl.question('\n你：');
  if (input === 'exit') break;

  round++;
  logLine(input);
  memory.save({ role: 'user', content: input });
  const answer = await replay(input, memory.load());
  memory.save({ role: 'assistant', content: answer });
  logLine(answer);
  console.log('助手：', answer);
}

rl.close();
