import type { ToolDefinition } from '../models/deepseek';

export const definition: ToolDefinition = {
  type: 'function',
  function: {
    name: 'web_search',
    description:
      '调用全网搜索引擎获取实时外部信息。用于回答模型知识库截止后发生的新闻、事件、人事变动、最新数据等时效性问题，或核查事实真伪。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索查询词，建议使用精准表述，可包含站点限定等高级语法',
        },
        max_results: {
          type: 'integer',
          default: 5,
          description: '返回搜索结果的条数',
        },
      },

      required: ['query'],
    },
  },
};

export async function run(args: { query: string }) {
  const resp = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query: args.query,
      search_depth: 'advanced',
      max_results: 5,
    }),
  });
  const res = await resp.json();
  return res.results.map((r: any) => ({
    title: r.title,
    url: r.url,
    content: r.content,
    published_date: r.published_date,
    score: r.score,
  }));
}
