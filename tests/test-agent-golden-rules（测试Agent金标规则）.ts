import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const baseDir = path.join(cwd, '聊天', 'Agent聊天效果评估');

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const readText = (fileName: string) => readFileSync(path.join(baseDir, fileName), 'utf8');

const requiredFiles = [
  'README（说明）.md',
  'PortfolioNarrative（作品集叙事）.md',
  'GoldenSet（金标集）.md',
  'ConversationFlows（多轮对话流程）.md',
  'ToneRubric（语气评分标准）.md',
  'Badcase（坏案例）.md',
  'Baseline（基线记录）.md',
  'IterationLog（迭代记录）.md',
  'PromptChangeLog（提示词变更记录）.md',
  'PrivacyPolicy（隐私边界）.md',
  'RealContextExport（真实上下文导出说明）.md',
  'EvaluationLog.synthetic.latest（合成上下文最新评估）.md',
  'EvaluationLog.flows.synthetic.latest（多轮流程最新评估）.md',
  'synthetic-context（合成上下文）.json',
];

for (const fileName of requiredFiles) {
  assert(existsSync(path.join(baseDir, fileName)), `missing required evaluation file: ${fileName}`);
}

assert(
  existsSync(path.join(cwd, 'scripts', 'run-agent-golden-set（运行Agent金标集评估）.ts')),
  'missing Chinese-named evaluation script',
);

const goldenSet = readText('GoldenSet（金标集）.md');
const goldenCases = [...goldenSet.matchAll(/^### ((PLANNING|STATE|ACTION|DAILY)-\d{2})｜/gm)];
assert(goldenCases.length === 40, `GoldenSet should contain 40 cases, got ${goldenCases.length}`);

const categories = ['PLANNING', 'STATE', 'ACTION', 'DAILY'];
for (const heading of ['Planning（时间规划）', 'State Review（状态复盘）', 'Action Draft（行动草案）', 'Daily Chat（日常对话）']) {
  assert(goldenSet.includes(`## ${heading}`), `GoldenSet missing bilingual category heading: ${heading}`);
}

for (const category of categories) {
  const count = goldenCases.filter(match => match[2] === category).length;
  assert(count === 10, `${category} should contain 10 cases, got ${count}`);
}

for (let index = 0; index < goldenCases.length; index += 1) {
  const start = goldenCases[index].index ?? 0;
  const end = goldenCases[index + 1]?.index ?? goldenSet.length;
  const body = goldenSet.slice(start, end);
  const id = goldenCases[index][1];
  for (const label of ['用户问题：', 'Golden Criteria：', 'Golden Answer：', 'Badcase 风险：', '评分重点：']) {
    assert(body.includes(label), `${id} missing field ${label}`);
  }
}

const flows = readText('ConversationFlows（多轮对话流程）.md');
for (const heading of ['Planning（时间规划）', 'State Review（状态复盘）', 'Action Draft（行动草案）', 'Daily Chat（日常对话）']) {
  assert(flows.includes(`## ${heading}`), `ConversationFlows missing bilingual category heading: ${heading}`);
}

const flowCases = [...flows.matchAll(/^### (FLOW-(PLANNING|STATE|ACTION|DAILY)-\d{2})｜/gm)];
assert(flowCases.length === 8, `ConversationFlows should contain 8 flows, got ${flowCases.length}`);

for (const category of categories) {
  const count = flowCases.filter(match => match[2] === category).length;
  assert(count === 2, `${category} should contain 2 flows, got ${count}`);
}

for (let index = 0; index < flowCases.length; index += 1) {
  const start = flowCases[index].index ?? 0;
  const end = flowCases[index + 1]?.index ?? flows.length;
  const body = flows.slice(start, end);
  const id = flowCases[index][1];
  const turnCount = [...body.matchAll(/^第 \d+ 轮/gm)].length;
  assert(turnCount >= 3 && turnCount <= 5, `${id} should contain 3 to 5 turns, got ${turnCount}`);
  assert(body.includes('理想回答特征：'), `${id} missing ideal response traits`);
  assert(body.includes('Badcase 风险：'), `${id} missing badcase risk`);
  assert(body.includes('评分重点：上下文连续性、语气连续性、任务推进能力同等重要。'), `${id} missing flow scoring focus`);
}

const badcase = readText('Badcase（坏案例）.md');
for (const keyword of ['报告腔', 'Markdown 符号', '编造上下文', '越权行动', '心理诊断化', '日常对话僵硬', '状态', '修复动作', '复测结果']) {
  assert(badcase.includes(keyword), `Badcase doc missing ${keyword}`);
}

const toneRubric = readText('ToneRubric（语气评分标准）.md');
for (const keyword of ['20 分及以上为通过', '硬失败', '自然对话', '上下文准确', '边界感', '可执行性', '陪伴感']) {
  assert(toneRubric.includes(keyword), `ToneRubric missing ${keyword}`);
}

const privacy = readText('PrivacyPolicy（隐私边界）.md');
for (const keyword of ['synthetic 模式', 'real 模式', 'clientContext.real.local', '--allow-real-judge', '不直接读取 Supabase']) {
  assert(privacy.includes(keyword), `PrivacyPolicy missing ${keyword}`);
}

const realExport = readText('RealContextExport（真实上下文导出说明）.md');
for (const keyword of ['导出上下文', 'clientContext.real.local', 'private/clientContext.real.local', '--mode real', '不直接读取 Supabase']) {
  assert(realExport.includes(keyword), `RealContextExport missing ${keyword}`);
}

const promptChangeLog = readText('PromptChangeLog（提示词变更记录）.md');
assert(promptChangeLog.includes('V1.1'), 'PromptChangeLog should record V1.1');

const iterationLog = readText('IterationLog（迭代记录）.md');
for (const keyword of ['发现 Badcase', '修复策略', '复测计划', '复测结果']) {
  assert(iterationLog.includes(keyword), `IterationLog missing ${keyword}`);
}

const gitignore = readFileSync(path.join(cwd, '.gitignore'), 'utf8');
assert(gitignore.includes('聊天/Agent聊天效果评估/private/runs/'), 'root .gitignore should protect private evaluation runs');
assert(existsSync(path.join(baseDir, 'private', '.gitignore')), 'private evaluation folder should have its own .gitignore');

JSON.parse(readText('synthetic-context（合成上下文）.json'));

console.log('Agent golden rules test passed');
