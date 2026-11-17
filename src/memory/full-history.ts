import type { Message } from '../models/deepseek';

const history: Message[] = [];

export const memory = {
  load: () => history,
  save: (msg: Message) => {
    history.push(msg);
  },
};
