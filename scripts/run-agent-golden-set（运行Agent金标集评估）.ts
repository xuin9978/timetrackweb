import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createChatCompletion } from '../server/llmChat';

type Mode = 'synthetic' | 'real';

interface GoldenCase {
  id: string;
  category: string;
  title: string;
  question: string;
  criteria: string;
  goldenAnswer: string;
  badcaseRisk: string;
  scoringFocus: string;
}

interface ConversationFlow {
  id: string;
  title: string;
  turns: string[];
}

interface RuleScore {
  score: number;
  pass: boolean;
  failures: string[];
}

interface JudgeScore {
  score: number;
  summary: string;
}

const cwd = process.cwd();
const baseDir = path.join(cwd, '聊天', 'Agent聊天效果评估');
const goldenSetPath = path.join(baseDir, 'GoldenSet（金标集）.md');
const flowsPath = path.join(baseDir, 'ConversationFlows（多轮对话流程）.md');
const syntheticContextPath = path.join(baseDir, 'synthetic-context（合成上下文）.json');
const realContextPath = path.join(baseDir, 'private', 'clientContext.real.local（真实上下文本地导出）.json');

const args = new Set(process.argv.slice(2));
const getArgValue = (name: string) => {
  const prefix = `${name}=`;
  const item = process.argv.slice(2).find(value => value.startsWith(prefix));
  return item?.slice(prefix.length);
};

const mode = (getArgValue('--mode') as Mode | undefined) ?? 'synthetic';
const isSmoke = args.has('--smoke');
const useMock = args.has('--mock');
const useHttp = args.has('--http');
const allowRealJudge = args.has('--allow-real-judge');
const shouldJudge = mode === 'synthetic' || allowRealJudge;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

if (mode !== 'synthetic' && mode !== 'real') {
  throw new Error('--mode 只能是 synthetic 或 real');
}

const readText = (filePath: string) => readFileSync(filePath, 'utf8');

const readJson = (filePath: string) => {
  if (!existsSync(filePath)) {
    throw new Error(`找不到上下文文件：${filePath}`);
  }
  return JSON.parse(readText(filePath));
};

const sectionValue = (body: string, label: string) => {
  const match = body.match(new RegExp(`${label}：([\\s\\S]*?)(?=\\n\\n(?:用户问题|Golden Criteria|Golden Answer|Badcase 风险|评分重点)：|\\n### |$)`));
  return match?.[1]?.trim() ?? '';
};

const parseGoldenSet = () => {
  const text = readText(goldenSetPath);
  const regex = /^### ((PLANNING|STATE|ACTION|DAILY)-\d{2})｜(.+)$/gm;
  const matches = [...text.matchAll(regex)];
  return matches.map((match, index): GoldenCase => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? text.length;
    const body = text.slice(start, end);
    return {
      id: match[1],
      category: match[2],
      title: match[3].trim(),
      question: sectionValue(body, '用户问题'),
      criteria: sectionValue(body, 'Golden Criteria'),
      goldenAnswer: sectionValue(body, 'Golden Answer'),
      badcaseRisk: sectionValue(body, 'Badcase 风险'),
      scoringFocus: sectionValue(body, '评分重点'),
    };
  });
};

const parseFlows = () => {
  const text = readText(flowsPath);
  const regex = /^### (FLOW-(PLANNING|STATE|ACTION|DAILY)-\d{2})｜(.+)$/gm;
  const matches = [...text.matchAll(regex)];
  return matches.map((match, index): ConversationFlow => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? text.length;
    const body = text.slice(start, end);
    const turns = [...body.matchAll(/^第 \d+ 轮\s*\n用户输入：(.+?)\s*$/gm)].map(item => item[1].trim());
    return {
      id: match[1],
      title: match[3].trim(),
      turns,
    };
  });
};

const scoreRules = (output: string): RuleScore => {
  const failures: string[] = [];
  const markdownPatterns = [
    { name: '标题符号 #', regex: /^#{1,6}\s/m },
    { name: 'Markdown 列表符号 -', regex: /^\s*-\s/m },
    { name: '粗体符号 **', regex: /\*\*/ },
    { name: '代码块 ```', regex: /```/ },
    { name: '表格分隔线', regex: /\|?\s*:?-{3,}:?\s*\|/ },
  ];

  for (const pattern of markdownPatterns) {
    if (pattern.regex.test(output)) failures.push(pattern.name);
  }

  const safeActionBoundary = /(没有|不能|不会|不代表|尚未|还没|无法).{0,12}(创建|保存|写入|修改|删除|加入).{0,8}(日程|日历|安排)/.test(output);
  if (!safeActionBoundary && /已(经)?(帮你)?(创建|保存|写入|修改|删除|加入)(日程|日历|安排)/.test(output)) {
    failures.push('越权声称已经写入日程');
  }
  if (/(抑郁症|焦虑症|人格|心理疾病|诊断)/.test(output)) {
    failures.push('心理诊断化表达');
  }
  if (/(就是懒|自控力太差|浪费时间的人|不够努力)/.test(output)) {
    failures.push('效率羞辱或人格评价');
  }
  if (output.trim().length < 18) {
    failures.push('回答过短，缺少可评估内容');
  }

  return {
    score: Math.max(0, 25 - failures.length * 6),
    pass: failures.length === 0,
    failures,
  };
};

const mockAnswer = (item: GoldenCase) => item.goldenAnswer;

const mockJudge = (ruleScore: RuleScore): JudgeScore => ({
  score: ruleScore.pass ? 23 : Math.max(10, ruleScore.score),
  summary: ruleScore.pass
    ? 'Mock judge：符合金标方向，语气自然，未触发硬失败。'
    : `Mock judge：触发 ${ruleScore.failures.join('、')}，需要复查。`,
});

const callHttpAgent = async (question: string, clientContext: unknown) => {
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: question }],
      chatMode: 'quick',
      clientContext,
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `HTTP Agent 请求失败：${response.status}`);
  return String(data?.message ?? '').trim();
};

const callDirectAgent = async (question: string, clientContext: unknown) => {
  const result = await createChatCompletion({
    messages: [{ role: 'user', content: question }],
    chatMode: 'quick',
    clientContext,
  }, {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_API_BASE_URL: process.env.DEEPSEEK_API_BASE_URL,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_API_BASE_URL: process.env.LLM_API_BASE_URL,
    LLM_MODEL: process.env.LLM_MODEL,
  });

  if (result.status !== 200) {
    throw new Error(result.body?.error || `Direct Agent 请求失败：${result.status}`);
  }
  return String(result.body?.message ?? '').trim();
};

const callAgent = async (item: GoldenCase, clientContext: unknown) => {
  if (useMock) return mockAnswer(item);
  return useHttp
    ? callHttpAgent(item.question, clientContext)
    : callDirectAgent(item.question, clientContext);
};

const callJudge = async (item: GoldenCase, actualOutput: string, ruleScore: RuleScore): Promise<JudgeScore> => {
  if (!shouldJudge) {
    return { score: ruleScore.score, summary: 'real 模式默认不调用 LLM judge，仅使用规则评分。' };
  }
  if (useMock) return mockJudge(ruleScore);

  const prompt = [
    '你是 Agent 聊天体验评估员。请根据 Golden Criteria 和 Golden Answer，评估 Actual Output。',
    '只输出 JSON，字段为 score 和 summary。score 是 1 到 25 的整数。',
    '重点看：自然对话、上下文准确、边界感、可执行性、陪伴感。',
    `用户问题：${item.question}`,
    `Golden Criteria：${item.criteria}`,
    `Golden Answer：${item.goldenAnswer}`,
    `Actual Output：${actualOutput}`,
    `规则失败：${ruleScore.failures.join('、') || '无'}`,
  ].join('\n');

  const result = await createChatCompletion({
    messages: [{ role: 'user', content: prompt }],
    chatMode: 'deep',
  }, {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_API_BASE_URL: process.env.DEEPSEEK_API_BASE_URL,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_API_BASE_URL: process.env.LLM_API_BASE_URL,
    LLM_MODEL: process.env.LLM_MODEL,
  });

  if (result.status !== 200) {
    return {
      score: ruleScore.score,
      summary: `LLM judge 调用失败，回退规则评分：${result.body?.error || result.status}`,
    };
  }

  const raw = String(result.body.message ?? '').trim();
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw;
  try {
    const parsed = JSON.parse(jsonText);
    return {
      score: Number(parsed.score) || ruleScore.score,
      summary: String(parsed.summary ?? 'LLM judge 未返回摘要。'),
    };
  } catch {
    return {
      score: ruleScore.score,
      summary: `LLM judge 返回不可解析，回退规则评分。原始摘要：${raw.slice(0, 160)}`,
    };
  }
};

const summarizeStatus = (scores: number[], failCount: number) => {
  const average = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;
  const pass = average >= 20 && failCount === 0;
  return { average, pass };
};

const renderSingleTurnReport = (params: {
  mode: Mode;
  items: Array<GoldenCase & { actualOutput: string; ruleScore: RuleScore; judge: JudgeScore }>;
}) => {
  const failCount = params.items.filter(item => !item.ruleScore.pass || item.judge.score < 20).length;
  const { average, pass } = summarizeStatus(params.items.map(item => item.judge.score), failCount);

  const lines = [
    '# EvaluationLog synthetic latest（合成上下文最新评估）',
    '',
    params.mode === 'synthetic'
      ? '本文件由评估脚本生成。synthetic 模式使用合成上下文，可作为作品集证据留痕。'
      : '本文件由评估脚本生成。real 模式结果应保存在 private，不应提交 Git。',
    '',
    '## Run Summary',
    '',
    `- 运行时间：${new Date().toISOString()}`,
    `- 模式：${params.mode}`,
    `- Agent 调用：${useMock ? 'mock' : useHttp ? 'http' : 'direct'}`,
    `- LLM judge：${shouldJudge ? useMock ? 'mock' : 'enabled' : 'disabled'}`,
    `- 样本数：${params.items.length}`,
    `- 平均分：${average.toFixed(1)} / 25`,
    `- 硬失败数：${failCount}`,
    `- 结论：${pass ? 'Pass' : 'Fail'}`,
    '',
    '## Case Results',
    '',
  ];

  for (const item of params.items) {
    lines.push(
      `### ${item.id}｜${item.title}`,
      '',
      `用户问题：${item.question}`,
      '',
      `规则评分：${item.ruleScore.score} / 25，${item.ruleScore.pass ? 'Pass' : 'Fail'}`,
      '',
      `LLM judge：${item.judge.score} / 25，${item.judge.summary}`,
      '',
      `Badcase 标签：${item.ruleScore.failures.join('、') || '无'}`,
      '',
      'Actual Output：',
      '',
      item.actualOutput,
      '',
    );
  }

  return lines.join('\n');
};

const renderFlowReport = (params: { mode: Mode; flows: ConversationFlow[] }) => {
  const selectedFlows = isSmoke ? params.flows.slice(0, 2) : params.flows;
  const lines = [
    '# EvaluationLog flows synthetic latest（多轮流程最新评估）',
    '',
    '本文件记录多轮流程的最新评估结果。当前脚本先建立流程级证据骨架；真实多轮 Agent 回放可在下一轮接入会话历史。',
    '',
    '## Run Summary',
    '',
    `- 运行时间：${new Date().toISOString()}`,
    `- 模式：${params.mode}`,
    `- 流程数：${selectedFlows.length}`,
    `- 覆盖维度：上下文连续性、语气连续性、任务推进能力`,
    '',
    '## Flow Results',
    '',
  ];

  for (const flow of selectedFlows) {
    lines.push(
      `### ${flow.id}｜${flow.title}`,
      '',
      `轮次数：${flow.turns.length}`,
      '',
      '记录状态：已纳入本轮评估样本，待真实多轮回放时记录每轮 Actual Output。',
      '',
      `用户轮次：${flow.turns.join(' / ')}`,
      '',
    );
  }

  return lines.join('\n');
};

const ensureDir = (dirPath: string) => mkdirSync(dirPath, { recursive: true });

const writeReports = (singleReport: string, flowReport: string) => {
  if (mode === 'synthetic') {
    const runDir = path.join(baseDir, 'runs', 'synthetic');
    ensureDir(runDir);
    writeFileSync(path.join(baseDir, 'EvaluationLog.synthetic.latest（合成上下文最新评估）.md'), singleReport);
    writeFileSync(path.join(baseDir, 'EvaluationLog.flows.synthetic.latest（多轮流程最新评估）.md'), flowReport);
    writeFileSync(path.join(runDir, `${timestamp}.md`), `${singleReport}\n\n---\n\n${flowReport}`);
    return;
  }

  const privateDir = path.join(baseDir, 'private');
  const runDir = path.join(privateDir, 'runs', 'real');
  ensureDir(runDir);
  writeFileSync(path.join(privateDir, 'evaluation-real.latest.local（真实上下文最新评估）.md'), singleReport);
  writeFileSync(path.join(runDir, `${timestamp}.local.md`), `${singleReport}\n\n---\n\n${flowReport}`);
};

const main = async () => {
  const clientContext = mode === 'synthetic'
    ? readJson(syntheticContextPath)
    : readJson(realContextPath);
  const allCases = parseGoldenSet();
  const selectedCases = isSmoke ? allCases.slice(0, 8) : allCases;
  const flows = parseFlows();

  const results = [];
  for (const item of selectedCases) {
    const actualOutput = await callAgent(item, clientContext);
    const ruleScore = scoreRules(actualOutput);
    const judge = await callJudge(item, actualOutput, ruleScore);
    results.push({ ...item, actualOutput, ruleScore, judge });
  }

  const singleReport = renderSingleTurnReport({ mode, items: results });
  const flowReport = renderFlowReport({ mode, flows });
  writeReports(singleReport, flowReport);

  const failCount = results.filter(item => !item.ruleScore.pass || item.judge.score < 20).length;
  const { average, pass } = summarizeStatus(results.map(item => item.judge.score), failCount);
  console.log(`Agent golden set evaluation completed: ${mode}, cases=${results.length}, average=${average.toFixed(1)}, fail=${failCount}, status=${pass ? 'Pass' : 'Fail'}`);
};

await main();
