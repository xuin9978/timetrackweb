import path from 'path';
import { readFile } from 'node:fs/promises';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const DAY_JOURNEY_PROMPT_VERSION = 'day-journey-system-prompt-v1.6';
const DAY_JOURNEY_PROMPT_PATH = path.resolve(__dirname, 'docs/ai-day-journey/一天之旅系统提示词.md');
const DAY_JOURNEY_STYLE_GUIDE = [
  'Golden md 只作为格式、风格、段落组织和 Eval Rubric 参考，不作为当天事实来源。',
  '输出应是「一天之旅」叙事：固定 Markdown 结构、关键词、早上/下午/晚上、一日回顾。',
  '每个时段把相邻、连续、主题相关的记录合并为自然段，通常 1 到 4 段，不要一条 event 一个段落。',
  '每个自然段可以包含多个来自 displayStartTime 的时间点，但不得生成输入中不存在的时间点。',
  '每个时段末尾用单独加粗的 ◆ 段落客观归纳该时段事项。',
  '一天回顾用 ☀️ / 🌇 / 🌃 三段第一人称，连贯叙述，不机械复制日程，不加入主观拔高。',
  '所有正文段落以两个中文全角空格开头；标题行和小标题不缩进。',
  '注意：这份 Style Guide 不含可用于生成的事实。当天事实只能来自 current_day_fact_whitelist、events_json 和 events_readable_for_generation。'
].join('\n');

const getDayJourneyDateSpecificRules = (date: string) => {
  if (date === '2026-06-01') {
    return [
      '本日期是复盘日样例。仅当 payload 中明确出现时，关键词和正文应保留阅读、周复盘、月度复盘、6 月规划、历史复盘整理、Learn Claude Code 等主线。',
      '本日期午饭及午饭后的记录进入下午；从 11:30 午饭开始进入下午。'
    ];
  }
  if (date === '2026-06-02') {
    return [
      '本日期是项目开发和工程调试样例。仅当 payload 中明确出现时，关键词和正文应保留 Learn Claude Code、6 月规划、Agent 专项归档、时间管理项目、Supabase、Trae、CodeX、AI PRD、浏览器插件等主线。',
      '如果原始事实是“帮老爸弄照片”，不得写成“老爸生日”。'
    ];
  }
  if (date === '2026-06-03') {
    return [
      '本日期是 Golden Case。仅当 payload 中明确出现时，关键词和正文应保留当天主线词；5:30 和 6:30 等 displayStartTime 不得漂移。'
    ];
  }
  if (date === '2026-06-04') {
    return [
      '本日期是最高优先级格式范本对应日期。只从当前 payload 提取事实，并参考最终范本的抽象层级和分段节奏。',
      '本日期分段参考：7:15 到 12:14 前归入早上，从 12:14 这一条开始进入下午，从 18:15 这一条开始进入晚上。'
    ];
  }
  return [];
};

const DAY_JOURNEY_FOREIGN_FACT_TERMS = [
  'yyw',
  '东方树叶',
  '人工智能白皮书',
  '客观评判标准',
  '最佳实践原则',
  '贝索斯',
  'Telegram 创始人',
  '元思考'
];

type ChatMessage = {
  role: 'system' | 'user';
  content: string;
};

type LlmProvider = {
  name: string;
  url: string;
  apiKey: string;
  model: string;
};

const readRequestBody = async (req: import('node:http').IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

const sendJson = (res: import('node:http').ServerResponse, statusCode: number, body: unknown) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

const extractJsonObject = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? match[0] : trimmed;
};

const getProviders = (env: Record<string, string>): LlmProvider[] => {
  const deepseekKey = env.DEEPSEEK_API_KEY;
  const glmKey = env.GLM_API_KEY;

  return [
    glmKey
      ? {
          name: 'glm',
          url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
          apiKey: glmKey,
          model: 'glm-4-flash'
        }
      : null,
    deepseekKey
      ? {
          name: 'deepseek',
          url: 'https://api.deepseek.com/chat/completions',
          apiKey: deepseekKey,
          model: 'deepseek-chat'
        }
      : null
  ].filter(Boolean) as LlmProvider[];
};

const buildDailyReviewPrompt = (payload: unknown) => [
  {
    role: 'system',
    content: [
      '你是一个克制、可靠的个人时间管理复盘助手。',
      '',
      '你的任务是基于用户当天的时间记录数据，生成一份结构化的每日复盘。你只能使用输入中明确提供的 events、tags、时间范围、事件标题、起止时间、时长和聚合统计信息进行分析。',
      '',
      '你不是心理咨询师、职业规划师、绩效评估者，也不是任务管理 Agent。你的输出应帮助用户看清今天时间如何被使用，并给出少量、具体、可执行的明日建议。',
      '',
      '你必须遵守以下原则：',
      '',
      '1. 事实优先',
      '- 只能引用输入数据中存在的事件、标签、时间段、时长和统计结果。',
      '- 不得编造用户没有记录的事件、目标、情绪、原因、动机或成果。',
      '- 不得把“没有记录”解释为“一定没有发生”。',
      '- 不得根据少量记录做过度推断。',
      '',
      '2. 表达克制',
      '- 不评价用户是否自律、拖延、懒惰、焦虑或失败。',
      '- 不使用责备、鸡汤、夸张或诊断式语言。',
      '- 不做人生建议、医疗建议、心理建议或重大职业判断。',
      '- 如果数据不足，应明确说明“当前数据不足以判断”。',
      '',
      '3. 输出具体',
      '- 每条洞察必须附带数据依据。',
      '- 每条建议必须能在明天执行。',
      '- 建议数量保持克制，不超过 3 条。',
      '- 风险提醒只指出时间记录中能观察到的风险，例如长时间连续投入、休息记录偏少、记录过碎、晚间任务过多等。',
      '',
      '4. 结构稳定',
      '- 必须严格输出 JSON。',
      '- 不要输出 Markdown。',
      '- 不要输出解释 JSON 的额外文字。',
      '- 不要添加未定义字段。'
    ].join('\n')
  },
  {
    role: 'user',
    content: [
      '请基于以下时间记录生成 AI 日复盘 JSON。',
      'JSON 字段必须包含 summary, time_distribution, evidence_based_observations, risks, tomorrow_actions, data_limitations。',
      'summary: string，用 1-2 句话总结今天的时间使用情况，必须基于数据，不要评价人格或能力。',
      'time_distribution: [{ label, duration_minutes, ratio, observation }]',
      'evidence_based_observations: [{ title, detail, evidence }]',
      'risks: [{ risk, reason, severity }]',
      'tomorrow_actions: [{ action, why, scope }]',
      'data_limitations: string[]',
      '',
      '如果当天没有事件记录，请输出空的 time_distribution、evidence_based_observations、risks，并在 data_limitations 说明无法判断时间分布和投入情况。',
      '如果数据很少，请降低判断强度，避免生成过多洞察。',
      '输入数据：',
      JSON.stringify(payload)
    ].join('\n')
  }
];

const callOpenAICompatible = async (
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    responseFormat?: { type: string };
    maxTokens?: number;
  }
) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.2,
      ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {}),
      ...(options?.responseFormat ? { response_format: options.responseFormat } : {})
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('LLM response missing message content');
  }

  return content;
};

const callDailyReview = async (provider: LlmProvider, payload: unknown) => {
  const content = await callOpenAICompatible(
    provider.url,
    provider.apiKey,
    provider.model,
    buildDailyReviewPrompt(payload),
    { temperature: 0.2, responseFormat: { type: 'json_object' } }
  );
  return JSON.parse(extractJsonObject(content));
};

const normalizeDayJourneyEvent = (event: Record<string, unknown>, tagsById: Map<string, Record<string, unknown>>) => {
  const tagId = String(event.tagId ?? event.category ?? '');
  const tag = tagId ? tagsById.get(tagId) : undefined;
  const category = String(event.category ?? tag?.icon ?? '');
  const start = String(event.start ?? event.startTime ?? '');
  const end = String(event.end ?? event.endTime ?? '');
  const rawTitle = String(event.rawTitle ?? event.title ?? '');
  const rawDescription = String(event.rawDescription ?? event.description ?? '');
  const suggestedSegment = inferDayJourneySegment(start, category, rawTitle);
  return {
    id: event.id ?? '',
    title: rawTitle,
    rawTitle,
    rawDescription,
    start,
    end,
    displayStartTime: String(event.displayStartTime ?? formatDayJourneyTime(start)),
    displayEndTime: String(event.displayEndTime ?? formatDayJourneyTime(end)),
    tagId,
    tagName: String(event.tagName ?? tag?.name ?? tag?.label ?? ''),
    category,
    suggestedPeriod: suggestedSegment,
    suggestedSegment,
    startLocalTime: formatDayJourneyTime(start),
    endLocalTime: formatDayJourneyTime(end),
    description: rawDescription,
    mustKeepFacts: extractMustKeepFacts(rawTitle, rawDescription)
  };
};

const formatDayJourneyTime = (value: string) => {
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) return value;
  return `${Number(match[1])}:${match[2]}`;
};

const inferDayJourneySegment = (start: string, category: string, title: string) => {
  const match = start.match(/T(\d{2}):(\d{2})/);
  const text = `${category} ${title}`;
  if (match) {
    const minutes = Number(match[1]) * 60 + Number(match[2]);
    if (category.includes('🌃')) return '晚上';
    if (category.includes('🌇')) return '下午';
    if (
      minutes >= 11 * 60 + 20 &&
      minutes <= 13 * 60 + 30 &&
      /(午饭|吃饭|午餐|粽子|青团)/.test(text)
    ) {
      return '下午';
    }
    if (minutes >= 18 * 60 + 15) return '晚上';
    if (minutes >= 12 * 60 + 14) return '下午';
    if (category.includes('☀️')) return '早上';
  }
  if (category.includes('🌃')) return '晚上';
  if (category.includes('🌇')) return '下午';
  if (category.includes('☀️')) return '早上';
  if (!match) return '待判断';
  return '早上';
};

const extractMustKeepFacts = (title: string, description: string) => {
  const text = [title, description].filter(Boolean).join('。');
  return text
    .replace(/^[☀️🌇🌃🍚🌀📖💤：:\s]+/, '')
    .split(/[，,。；;、]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, 12);
};

const buildCurrentDayFactWhitelist = (events: ReturnType<typeof normalizeDayJourneyEvent>[]) => {
  const facts = new Set<string>();
  events.forEach((event) => {
    [
      event.displayStartTime,
      event.rawTitle,
      event.rawDescription,
      event.tagName,
      event.category,
      ...event.mustKeepFacts
    ]
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .forEach((item) => facts.add(item));
  });
  return Array.from(facts);
};

const formatDayJourneyEventLines = (events: ReturnType<typeof normalizeDayJourneyEvent>[]) =>
  events
    .map((event, index) =>
      [
        `${index + 1}. [${event.suggestedSegment}] displayStartTime=${event.displayStartTime} displayEndTime=${event.displayEndTime}`,
        `   category: ${event.category || '未标注'}`,
        `   tagName: ${event.tagName || '未标注'}`,
        `   rawTitle: ${event.rawTitle}`,
        event.rawDescription ? `   rawDescription: ${event.rawDescription}` : '',
        `   suggestedSegment: ${event.suggestedSegment}`,
        `   mustKeepFacts: ${event.mustKeepFacts.join(' / ')}`
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n');

const validateDayJourneyMarkdown = (markdown: string) => {
  const requiredParts = [
    '## ',
    '**关键词：',
    '### ☀️早上',
    '### 🌇下午',
    '### 🌃晚上',
    '### 一天回顾'
  ];

  return requiredParts
    .filter((part) => !markdown.includes(part))
    .map((part) => `生成结果缺少必要结构：${part}`);
};

const mergeTimedParagraphsInSection = (section: string) => {
  const lines = section.trim().split(/\n+/).map((line) => line.trimEnd()).filter((line) => line.trim().length > 0);
  const merged: string[] = [];
  let timedBuffer: string[] = [];

  const flushTimedBuffer = () => {
    if (timedBuffer.length === 0) return;
    merged.push(
      `　　${timedBuffer
        .map((line) => line.replace(/^　　/, '').trim())
        .join('')}`
    );
    timedBuffer = [];
  };

  lines.forEach((line) => {
    const normalizedLine = line.startsWith('　　') ? line : `　　${line.trimStart()}`;
    if (/^　　\d{1,2}:\d{2}[，,]/.test(normalizedLine)) {
      timedBuffer.push(normalizedLine);
      return;
    }
    flushTimedBuffer();
    merged.push(normalizedLine);
  });
  flushTimedBuffer();

  return merged.join('\n\n');
};

const replaceSection = (markdown: string, startMarker: string, endMarker: string) => {
  const startIndex = markdown.indexOf(startMarker);
  const endIndex = markdown.indexOf(endMarker);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) return markdown;

  const before = markdown.slice(0, startIndex + startMarker.length);
  const section = markdown.slice(startIndex + startMarker.length, endIndex);
  const after = markdown.slice(endIndex);
  return `${before}\n\n${mergeTimedParagraphsInSection(section)}\n\n${after}`;
};

const normalizeDayJourneyMarkdown = (markdown: string) => {
  let normalized = markdown
    .replace(/　　🌇：下午我/g, '　　🌇：我下午')
    .replace(/　　🌃：晚上我/g, '　　🌃：我晚上');
  normalized = replaceSection(normalized, '### ☀️早上', '### 🌇下午');
  normalized = replaceSection(normalized, '### 🌇下午', '### 🌃晚上');
  normalized = replaceSection(normalized, '### 🌃晚上', '### 一天回顾');
  return normalized.replace(/\n{3,}/g, '\n\n').trim();
};

const validateDayJourneyQuality = (markdown: string, factWhitelist: string[] = []) => {
  const warnings: string[] = [];
  if (/[　\s]\d{2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/.test(markdown)) {
    warnings.push('生成结果仍使用完整起止时间范围，不够接近最终范本的时间点写法');
  }
  if (/[　\s]0\d:\d{2}/.test(markdown)) {
    warnings.push('生成结果仍存在前导 0 时间格式，例如 07:15');
  }
  const afternoon = markdown.split('### 🌇下午')[1]?.split('### 🌃晚上')[0] ?? '';
  if (afternoon.includes('11:17') || afternoon.includes('11:36')) {
    warnings.push('生成结果可能把 6 月 4 日上午事件错误放入下午');
  }
  const review = markdown.split('### 一天回顾')[1] ?? '';
  const reviewSections = ['☀️：我', '🌇：我', '🌃：我'].filter((part) => review.includes(part)).length;
  if (reviewSections < 3) {
    warnings.push('一天回顾没有完整使用 ☀️ / 🌇 / 🌃 三段第一人称');
  }
  if (review.length > 0 && review.length < 280) {
    warnings.push('一天回顾偏短，可能存在事实覆盖不足');
  }
  const summaryCount = (markdown.match(/\*\*◆/g) ?? []).length;
  if (summaryCount < 3) {
    warnings.push('加粗 ◆ 阶段归纳少于 3 段');
  }
  const sectionNames = [
    ['早上', '### ☀️早上', '### 🌇下午'],
    ['下午', '### 🌇下午', '### 🌃晚上'],
    ['晚上', '### 🌃晚上', '### 一天回顾']
  ] as const;
  sectionNames.forEach(([name, startMarker, endMarker]) => {
    const section = markdown.split(startMarker)[1]?.split(endMarker)[0] ?? '';
    const timedParagraphs = section
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^　*[\d]{1,2}:\d{2}[，,]/.test(line));
    if (timedParagraphs.length > 4) {
      warnings.push(`${name}时段正文段落过碎，可能仍是一条 event 一个段落`);
    }
  });
  if (markdown.includes('帮老爸弄照片') && markdown.includes('老爸生日')) {
    warnings.push('生成结果可能把“帮老爸弄照片”改写为“老爸生日”');
  }
  const whitelistText = factWhitelist.join('\n');
  const foreignFacts = DAY_JOURNEY_FOREIGN_FACT_TERMS.filter((term) => markdown.includes(term) && !whitelistText.includes(term));
  if (foreignFacts.length > 0) {
    warnings.push(`生成结果疑似出现当前 payload 以外的外来事实：${foreignFacts.join('、')}`);
  }
  const bodyLinesMissingIndent = markdown
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .filter((line) => !line.trimStart().startsWith('## '))
    .filter((line) => !line.trimStart().startsWith('### '))
    .filter((line) => !line.startsWith('　　'));
  if (bodyLinesMissingIndent.length > 0) {
    warnings.push('部分正文段落缺少两个中文全角空格缩进');
  }
  if (/[，、的和与或及并用为把将对在了“”A-Za-z0-9]$/.test(markdown.trim())) {
    warnings.push('生成结果结尾可能不完整，疑似被截断');
  }
  return warnings;
};

const buildDayJourneyPrompt = async (payload: Record<string, unknown>): Promise<ChatMessage[]> => {
  const systemPrompt = await readFile(DAY_JOURNEY_PROMPT_PATH, 'utf8');
  const date = String(payload.date ?? '');
  const tags = Array.isArray(payload.tags) ? (payload.tags as Record<string, unknown>[]) : [];
  const tagsById = new Map(tags.map((tag) => [String(tag.id ?? ''), tag]));
  const rawEvents = Array.isArray(payload.events) ? (payload.events as Record<string, unknown>[]) : [];
  const events = rawEvents.map((event) => normalizeDayJourneyEvent(event, tagsById));
  const factWhitelist = buildCurrentDayFactWhitelist(events);
  const dateSpecificRules = getDayJourneyDateSpecificRules(date);

  return [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: [
        '请基于以下当天原始日程 / 时间记录，生成「一天之旅」Markdown。',
        '',
        '请严格遵守系统提示词 V1.6：原始事实不能遗漏，可以合并表达，但不能删除事实；不要虚构输入中不存在的事件、人名、地点、工具或项目。',
        '最高事实边界：当前 payload 是唯一事实来源；Golden md 只能作为格式和 Eval 标准，不能复制其中任何具体事实。',
        '特别注意：生成正文、关键词、阶段归纳和一天回顾时，只能使用 current_day_fact_whitelist、events_json 和 events_readable_for_generation 中出现的事实。',
        '特别注意：不得使用当前 payload 以外的人名、地点、工具、事件、项目、书名、对话对象或结论。',
        '特别注意：必须输出完整结构，不能缺少 ### ☀️早上、### 🌇下午、### 🌃晚上、### 一天回顾。',
        '特别注意：输出正文中的时间点只能来自每条事件的 displayStartTime，不得自行推算、平移、四舍五入或改写开始时间。',
        '特别注意：输出正文不要写成“07:15 - 08:00：……”这种日历表格格式，应写成“7:15，……”这种时间点叙事格式。',
        '特别注意：一天回顾不能高度压缩，必须按 ☀️ / 🌇 / 🌃 三段覆盖各时段主要事实。',
        '特别注意：关键词不能过泛，也不能过碎；请对齐 Golden Set 的主线词粒度，不能只写“日常”“复盘”“项目”。',
        '特别注意：events_json 和 events_readable_for_generation 中的 rawTitle、rawDescription、mustKeepFacts 是事实保留依据，必须覆盖，不得改写。',
        '特别注意：如果原始事实是“帮老爸弄照片”，不得写成“老爸生日”；如果原始事实是“讨论营养补剂购买”，不得写成已经购买补剂。',
        '特别注意：午饭及午饭后的记录应进入下午；6 月 1 日从 11:30 午饭开始进入下午。',
        '特别注意：阶段 ◆ 归纳必须列出该时段关键事项，不能只写“日常、复盘、项目”。',
        '特别注意：所有正文段落必须以两个中文全角空格“　　”开头；标题行和空行不要缩进。',
        '特别注意：同一时段内禁止一条 event 一个段落；请把相邻、连续、主题相关的记录合并成 1 到 4 个自然段，避免写成日历流水账。',
        '特别注意：不要照抄 events_readable_for_generation 的换行方式；它只是输入清单，不是输出段落结构。',
        '特别注意：如果一个时段内事件较多，优先把 3 到 6 条连续记录合并到同一个自然段中，用多个时间点串联，而不是每个时间点另起一段。',
        '特别注意：一天回顾三段必须逐字以“　　☀️：我”“　　🌇：我”“　　🌃：我”开头，不能写成“🌇：下午我”或“🌃：晚上我”。',
        '特别注意：一天回顾中 ☀️ 只写早上事实，🌇 只写下午事实，🌃 只写晚上事实，不能把下午事实写进早上段，也不能把晚上事实写进下午段。',
        ...dateSpecificRules.map((rule) => `日期特定规则：${rule}`),
        '',
        `promptVersion: ${DAY_JOURNEY_PROMPT_VERSION}`,
        `date: ${date}`,
        `timezone: ${String(payload.timezone ?? 'Asia/Shanghai')}`,
        '',
        'style_guide_from_golden_set_non_factual:',
        DAY_JOURNEY_STYLE_GUIDE,
        '',
        'current_day_fact_whitelist:',
        JSON.stringify(factWhitelist, null, 2),
        '',
        'tags:',
        JSON.stringify(tags, null, 2),
        '',
        'events_json:',
        JSON.stringify(events, null, 2),
        '',
        'events_readable_for_generation:',
        formatDayJourneyEventLines(events)
      ].join('\n')
    }
  ];
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    console.log('VITE_SUPABASE_URL:', env.VITE_SUPABASE_URL ? '已加载' : '未加载');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'local-ai-daily-review-api',
          configureServer(server) {
            server.middlewares.use('/api/ai/daily-review', async (req, res) => {
              if (req.method !== 'POST') {
                sendJson(res, 405, { error: 'Method not allowed' });
                return;
              }

              try {
                const rawBody = await readRequestBody(req);
                const payload = rawBody ? JSON.parse(rawBody) : {};
                const providers = getProviders(env);

                if (providers.length === 0) {
                  sendJson(res, 500, { error: '未配置 DEEPSEEK_API_KEY 或 GLM_API_KEY' });
                  return;
                }

                let lastError = '';
                for (const provider of providers) {
                  try {
                    const review = await callDailyReview(provider, payload);
                    sendJson(res, 200, { provider: provider.name, review });
                    return;
                  } catch (error) {
                    lastError = error instanceof Error ? error.message : String(error);
                  }
                }

                sendJson(res, 502, { error: 'AI 日复盘生成失败', detail: lastError });
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                sendJson(res, 500, { error: 'AI 日复盘接口异常', detail: message });
              }
            });

            server.middlewares.use('/api/ai/day-journey', async (req, res) => {
              if (req.method !== 'POST') {
                sendJson(res, 405, {
                  success: false,
                  error: {
                    code: 'METHOD_NOT_ALLOWED',
                    message: '只支持 POST 请求'
                  }
                });
                return;
              }

              try {
                const rawBody = await readRequestBody(req);
                const payload = rawBody ? JSON.parse(rawBody) : {};
                const date = typeof payload.date === 'string' ? payload.date.trim() : '';
                const events = Array.isArray(payload.events) ? payload.events : [];

                if (!date) {
                  sendJson(res, 400, {
                    success: false,
                    error: {
                      code: 'INVALID_PAYLOAD',
                      message: '缺少 date，无法生成一天之旅'
                    }
                  });
                  return;
                }

                if (events.length === 0) {
                  sendJson(res, 200, {
                    success: false,
                    error: {
                      code: 'NO_EVENTS',
                      message: '当前日期暂无可生成的一天之旅记录'
                    }
                  });
                  return;
                }

                const providers = getProviders(env);
                if (providers.length === 0) {
                  sendJson(res, 500, {
                    success: false,
                    error: {
                      code: 'MISSING_API_KEY',
                      message: '未配置可用的模型 API Key'
                    }
                  });
                  return;
                }

                const messages = await buildDayJourneyPrompt(payload);
                let lastError = '';

                for (const provider of providers) {
                  try {
                    const markdown = normalizeDayJourneyMarkdown((await callOpenAICompatible(
                      provider.url,
                      provider.apiKey,
                      provider.model,
                      messages,
                      { temperature: 0.1, maxTokens: 4096 }
                    )).trim());

                    if (!markdown) {
                      throw new Error('EMPTY_MODEL_OUTPUT');
                    }

                    const warnings = [
                      ...validateDayJourneyMarkdown(markdown),
                      ...validateDayJourneyQuality(markdown, buildCurrentDayFactWhitelist(
                        (Array.isArray(payload.events) ? payload.events : []).map((event: Record<string, unknown>) => {
                          const tags = Array.isArray(payload.tags) ? (payload.tags as Record<string, unknown>[]) : [];
                          const tagsById = new Map(tags.map((tag) => [String(tag.id ?? ''), tag]));
                          return normalizeDayJourneyEvent(event, tagsById);
                        })
                      ))
                    ];
                    sendJson(res, 200, {
                      success: true,
                      provider: provider.name,
                      model: provider.model,
                      promptVersion: DAY_JOURNEY_PROMPT_VERSION,
                      date,
                      markdown,
                      warnings
                    });
                    return;
                  } catch (error) {
                    lastError = error instanceof Error ? error.message : String(error);
                  }
                }

                sendJson(res, 502, {
                  success: false,
                  error: {
                    code: 'AI_GENERATION_FAILED',
                    message: '一天之旅生成失败，请稍后重试'
                  },
                  detail: lastError
                });
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                sendJson(res, 500, {
                  success: false,
                  error: {
                    code: 'AI_GENERATION_FAILED',
                    message: '一天之旅生成失败，请稍后重试'
                  },
                  detail: message
                });
              }
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
  });
