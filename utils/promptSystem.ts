export type Structure = 'Q-A-minimal';

export interface FormatRequirements {
  minSentences: number;
  maxSentences: number;
  structure: Structure;
}

export interface ParsedInput {
  coreInstruction?: string;
  keyParams?: Record<string, string>;
  format?: FormatRequirements;
}

const cn = {
  missingParams: '请补充指定参数',
  rejected: '请求不符合模板结构',
};

const whitelist = [
  /\[核心指令\][\s\S]*?\[关键参数\][\s\S]*?\[输出格式要求\][\s\S]*/,
  /\$\{code_snippet\}[\s\S]*?优化要求：/,
  /\$\{api_endpoint\}[\s\S]*?调试要求：/,
];

function matchesWhitelist(input: string): boolean {
  return whitelist.some((r) => r.test(input));
}

function extractBlock(src: string, label: string): string | undefined {
  const re = new RegExp(`\\[${label}\\]([\\s\\S]*?)(?=\\n\\s*\\[|$)`);
  const m = src.match(re);
  return m ? m[1].trim() : undefined;
}

function parseJSONLike(s: string): Record<string, string> | undefined {
  try {
    const j = JSON.parse(s);
    if (j && typeof j === 'object') return j as Record<string, string>;
    return undefined;
  } catch {
    const lines = s.split(/\n|;|,/).map((x) => x.trim()).filter(Boolean);
    const kv: Record<string, string> = {};
    for (const line of lines) {
      const m = line.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
      if (m) kv[m[1].trim()] = m[2].trim();
    }
    return Object.keys(kv).length ? kv : undefined;
  }
}

function parseStructured(input: string): ParsedInput {
  const core = extractBlock(input, '核心指令');
  const paramsBlock = extractBlock(input, '关键参数');
  const fmtBlock = extractBlock(input, '输出格式要求');
  let fmt: FormatRequirements | undefined;
  if (fmtBlock) {
    const ms = fmtBlock.match(/(\d+)\s*[–-]\s*(\d+)/);
    fmt = {
      minSentences: ms ? parseInt(ms[1]) : 3,
      maxSentences: ms ? parseInt(ms[2]) : 5,
      structure: 'Q-A-minimal',
    };
  }
  const keyParams = paramsBlock ? parseJSONLike(paramsBlock) : undefined;
  return { coreInstruction: core, keyParams, format: fmt };
}

function parseTemplate(input: string): ParsedInput {
  if (/\$\{code_snippet\}/.test(input)) {
    return { coreInstruction: 'optimize_code', keyParams: undefined, format: { minSentences: 3, maxSentences: 5, structure: 'Q-A-minimal' } };
  }
  if (/\$\{api_endpoint\}/.test(input)) {
    return { coreInstruction: 'debug_api', keyParams: undefined, format: { minSentences: 3, maxSentences: 5, structure: 'Q-A-minimal' } };
  }
  return {};
}

function composeResponse(pi: ParsedInput): string {
  const fmt = pi.format ?? { minSentences: 3, maxSentences: 5, structure: 'Q-A-minimal' };
  const sentences: string[] = [];
  const q = `问题：${pi.coreInstruction ?? ''}`.trim();
  sentences.push(q);
  const params = pi.keyParams ? Object.entries(pi.keyParams).map(([k, v]) => `${k}=${v}`).join('，') : '';
  const s1 = `解决方案：严格仅处理关键参数：${params}`.trim();
  const s2 = `输出采用问题-解决方案结构，限定句子长度在${fmt.minSentences}到${fmt.maxSentences}句之间`.trim();
  const s3 = `当关键参数缺失时返回“${cn.missingParams}”，并拒绝非白名单模板`.trim();
  sentences.push(s1, s2, s3);
  while (sentences.length > fmt.maxSentences) sentences.pop();
  if (sentences.length < fmt.minSentences) {
    sentences.push('严格过滤非关键上下文并进行格式校验');
  }
  return sentences.join(' ');
}

export interface HandleResult {
  ok: boolean;
  message: string;
}

export function handlePrompt(input: string): HandleResult {
  if (!matchesWhitelist(input)) return { ok: false, message: cn.rejected };
  let parsed = /\[核心指令\]/.test(input) ? parseStructured(input) : parseTemplate(input);
  if (!parsed.coreInstruction) return { ok: false, message: cn.rejected };
  if (!parsed.keyParams || Object.keys(parsed.keyParams).length === 0) return { ok: false, message: cn.missingParams };
  const out = composeResponse(parsed);
  return { ok: true, message: out };
}

export function validateLength(content: string, min = 3, max = 5): boolean {
  const sentences = content.split(/[。！？.!?]+/).filter((s) => s.trim().length > 0);
  return sentences.length >= min && sentences.length <= max;
}

