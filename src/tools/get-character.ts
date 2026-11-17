import type { ToolDefinition } from '../models/deepseek';

export const definition: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_character',
    description: '查询原神角色的基础资料：星级、元素、武器类型。',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '角色的中文名，比如”胡桃“' },
      },
      required: ['name'],
    },
  },
};

export async function run(args: { name: string }) {
  const resp = await fetch('https://gi.yatta.moe/api/v2/chs/avatar');
  const data = await resp.json();
  const found: any = Object.values(data.data.items).find(
    (c: any) => c.name === args.name,
  );
  if (!found) return { error: `没有找到名称${args.name}` };
  return {
    name: found.name,
    rarity: found.rank,
    element: found.element,
    weapon: found.weaponType,
  };
}
