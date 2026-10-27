export const NODE_CLASS_NAME = 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded shadow-sm px-4 py-2 text-center text-sm font-medium min-w-[100px]';

export const EDGE_STYLE = { stroke: '#64748b' };
export const EDGE_LABEL_STYLE = { fill: '#94a3b8', fontWeight: 500 };
export const EDGE_LABEL_BG_STYLE = { fill: '#1e293b', fillOpacity: 0.8, rx: 4, ry: 4 };

export const SYSTEM_PROMPT_TEMPLATES = [
  {
    name: "Extract Knowledge Graph (New)",
    prompt: `你是一个从文本中提取知识图谱结构的专家。
你的任务是深入分析输入文本，准确提取其中的实体（作为节点）和实体之间的关系（作为边）。
请返回符合严格 JSON 格式的数据。

JSON 模式如下：
{
  "nodes": [
    { "id": "字符串 (唯一ID)", "label": "字符串 (显示名称)", "type": "字符串 (类型，例如: 人物, 组织...)", "properties": { "属性名": "属性值" } }
  ],
  "edges": [
    { "source": "字符串 (源节点ID)", "target": "字符串 (目标节点ID)", "relation": "字符串 (关系描述)" }
  ]
}

严格遵守以下规则：
1. 每个节点必须有唯一的 ID。
2. 边中的 source 和 target 必须引用 nodes 列表中存在的 ID。
3. 请优先使用中文进行提取（Tag, Relation, Type 等），除非原文是英文。
4. 确保返回的是合法的 JSON 格式。`
  },
  {
    name: "Modify Existing Graph",
    prompt: `你正在修改一个现有的图。
基于用户的输入，你必须：
1. 识别需要添加的任何新节点或边。
2. 识别需要更新或删除的任何现有节点或边（如果明确要求）。
3. 返回 完整的 更新后的图结构（结合旧的和新的/修改的元素）。
4. 保持现有节点的 ID 一致，除非它们被替换。
以严格的 JSON 格式返回。
`
  },
  {
    name: "Review & Analyze Graph",
    prompt: `请分析当前的图结构，并给出改进建议或回答用户的问题。
不需要返回图数据，只需返回分析结果或建议。由于 API 限制，这里必须包含 JSON 这几个字母以避免报错。`
  }
];
