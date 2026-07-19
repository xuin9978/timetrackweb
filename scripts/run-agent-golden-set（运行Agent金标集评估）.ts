import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
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

interface FlowTurnResult {
  turn: number;
  userInput: string;
  actualOutput: string;
  ruleScore: RuleScore;
}

interface FlowResult extends ConversationFlow {
  turnResults: FlowTurnResult[];
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
loadDotenv({ path: path.join(cwd, '.env'), quiet: true });
loadDotenv({ path: path.join(cwd, '.env.local'), quiet: true });

const baseDir = path.join(cwd, '聊天', 'Agent聊天效果评估');
const goldenSetPath = path.join(baseDir, 'GoldenSet（金标集）.md');
const flowsPath = path.join(baseDir, 'ConversationFlows（多轮对话流程）.md');
const syntheticContextPath = path.join(baseDir, 'synthetic-context（合成上下文）.json');
const realContextPath = path.join(baseDir, 'private', 'clientContext.real.local（真实上下文本地导出）.json');

const args = new Set(process.argv.slice(2));
const getArgValue = (name: string) => {
  const values = process.argv.slice(2);
  const prefix = `${name}=`;
  const item = values.find(value => value.startsWith(prefix));
  if (item) return item.slice(prefix.length);
  const index = values.indexOf(name);
  if (index >= 0) return values[index + 1];
  return undefined;
};

const mode = (getArgValue('--mode') as Mode | undefined) ?? 'synthetic';
const isSmoke = args.has('--smoke');
const useMock = args.has('--mock');
const useHttp = args.has('--http');
const allowRealJudge = args.has('--allow-real-judge');
const shouldJudge = mode === 'synthetic' || allowRealJudge;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const maxRetries = Number(getArgValue('--retries') ?? 2);

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
  if (/(抑郁症|焦虑症|人格障碍|心理疾病|医学诊断|心理诊断|诊断为)/.test(output)) {
    failures.push('心理诊断化表达');
  }
  const outputForShameCheck = output
    .replace(/(不是|并不是|并非|不代表|不说明|不等于).{0,8}不够努力/g, '')
    .replace(/不够努力.{0,8}(不是|并不是|并非).{0,8}(问题|原因)/g, '');
  if (/(就是懒|自控力太差|浪费时间的人|不够努力)/.test(outputForShameCheck)) {
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

const callHttpAgent = async (messages: Array<{ role: 'user' | 'assistant'; content: string }>, clientContext: unknown) => {
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      chatMode: 'quick',
      clientContext,
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `HTTP Agent 请求失败：${response.status}`);
  return String(data?.message ?? '').trim();
};

const callDirectAgent = async (messages: Array<{ role: 'user' | 'assistant'; content: string }>, clientContext: unknown) => {
  const result = await createChatCompletion({
    messages,
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
  return withRetry(
    () => useHttp
      ? callHttpAgent([{ role: 'user', content: item.question }], clientContext)
      : callDirectAgent([{ role: 'user', content: item.question }], clientContext),
    `${item.id} Agent 输出`
  );
};

const callFlowAgent = async (
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  clientContext: unknown
) => (
  withRetry(
    () => useHttp ? callHttpAgent(messages, clientContext) : callDirectAgent(messages, clientContext),
    '多轮 Agent 输出'
  )
);

const withRetry = async <T>(operation: () => Promise<T>, label: string): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1200 * (attempt + 1)));
      }
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${label}失败，已重试 ${maxRetries} 次：${message}`);
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
    params.mode === 'synthetic'
      ? '# EvaluationLog synthetic latest（合成上下文最新评估）'
      : '# EvaluationLog real latest（真实上下文最新评估）',
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

const renderFlowReport = (params: { mode: Mode; flows: FlowResult[] }) => {
  const selectedFlows = isSmoke ? params.flows.slice(0, 2) : params.flows;
  const allTurns = selectedFlows.flatMap(flow => flow.turnResults);
  const failCount = allTurns.filter(turn => !turn.ruleScore.pass).length;
  const average = allTurns.length
    ? allTurns.reduce((sum, turn) => sum + turn.ruleScore.score, 0) / allTurns.length
    : 0;
  const lines = [
    params.mode === 'synthetic'
      ? '# EvaluationLog flows synthetic latest（多轮流程最新评估）'
      : '# EvaluationLog flows real latest（真实多轮流程最新评估）',
    '',
    params.mode === 'synthetic'
      ? '本文件记录 8 组多轮流程的最新 synthetic 真实回放结果，重点关注上下文连续性、语气连续性和任务推进能力。'
      : '本文件记录 real 模式多轮流程评估结果，应保存在 private，不应提交 Git。',
    '',
    '## Run Summary',
    '',
    `- 运行时间：${new Date().toISOString()}`,
    `- 模式：${params.mode}`,
    `- Agent 调用：${useMock ? 'mock' : useHttp ? 'http' : 'direct'}`,
    `- 流程数：${selectedFlows.length}`,
    `- 总轮次数：${allTurns.length}`,
    `- 规则平均分：${average.toFixed(1)} / 25`,
    `- 硬失败数：${failCount}`,
    `- 结论：${average >= 20 && failCount === 0 ? 'Pass' : 'Fail'}`,
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
      `流程结论：${flow.turnResults.every(turn => turn.ruleScore.pass) ? 'Pass' : 'Fail'}`,
      '',
    );
    for (const turn of flow.turnResults) {
      lines.push(
        `第 ${turn.turn} 轮`,
        '',
        `用户输入：${turn.userInput}`,
        '',
        `规则评分：${turn.ruleScore.score} / 25，${turn.ruleScore.pass ? 'Pass' : 'Fail'}`,
        '',
        `Badcase 标签：${turn.ruleScore.failures.join('、') || '无'}`,
        '',
        'Actual Output：',
        '',
        turn.actualOutput,
        '',
      );
    }
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
  writeFileSync(path.join(privateDir, 'evaluation-flows-real.latest.local（真实多轮流程最新评估）.md'), flowReport);
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

  const selectedFlows = isSmoke ? flows.slice(0, 2) : flows;
  const flowResults: FlowResult[] = [];
  for (const flow of selectedFlows) {
    const conversation: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    const turnResults: FlowTurnResult[] = [];
    for (const [index, userInput] of flow.turns.entries()) {
      conversation.push({ role: 'user', content: userInput });
      const actualOutput = useMock
        ? `这是 ${flow.id} 第 ${index + 1} 轮的 mock 回答，用于验证多轮评估记录结构。`
        : await callFlowAgent(conversation, clientContext);
      conversation.push({ role: 'assistant', content: actualOutput });
      turnResults.push({
        turn: index + 1,
        userInput,
        actualOutput,
        ruleScore: scoreRules(actualOutput),
      });
    }
    flowResults.push({ ...flow, turnResults });
  }

  const singleReport = renderSingleTurnReport({ mode, items: results });
  const flowReport = renderFlowReport({ mode, flows: flowResults });
  writeReports(singleReport, flowReport);

  const failCount = results.filter(item => !item.ruleScore.pass || item.judge.score < 20).length;
  const { average, pass } = summarizeStatus(results.map(item => item.judge.score), failCount);
  console.log(`Agent golden set evaluation completed: ${mode}, cases=${results.length}, average=${average.toFixed(1)}, fail=${failCount}, status=${pass ? 'Pass' : 'Fail'}`);
};

await main();
