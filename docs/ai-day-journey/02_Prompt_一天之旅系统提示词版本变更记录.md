# 一天之旅系统提示词版本变更记录

## 0. 文件定位

本文件用于记录「一天之旅系统提示词.md」的版本演进、修复目标、涉及文件和测试结果。

## V1.6

更新时间：2026-06-06

### 修复背景

2026 年 6 月 5 日 Consistency Eval 中，同一日期连续生成 3 次后发现输出存在漂移，其中 Run 2 出现明显 Golden Reference 事实污染，把 6 月 1 日到 6 月 4 日 Golden 样例里的具体事实混入了 6 月 5 日输出，例如 `yyw`、`东方树叶`、`《人工智能白皮书》`、`客观评判标准`、`最佳实践原则` 等。

这说明问题不只是 temperature，而是生成上下文边界不够清楚：Golden md 应该作为格式、风格、段落组织和 Eval Rubric 参考，不能作为当前日期的事实来源。

### 修改内容

- 将系统提示词标题升级为 `稳定版 V1.6`。
- 明确当前 payload 是唯一事实来源。
- 明确 Golden md 只能用于学习格式、风格、段落组织和 Eval Rubric，不得复制或迁移其中任何具体事实。
- 明确不得使用当前 payload 以外的人名、地点、工具、事件、项目、书名、对话对象或结论。
- 强化 `current_day_fact_whitelist` / `allowedFacts` 思路，要求模型只使用当天 events 中出现的事实。
- 保留 V1.5 的自然段合并规则和 V1.4 的两个中文全角空格缩进规则。

### 接口配套修改

- `/api/ai/day-journey` 的 `promptVersion` 升级为 `day-journey-system-prompt-v1.6`。
- 不再把 6 月 1 日到 6 月 4 日完整 Golden md 原文作为生成事实上下文传给模型。
- 改为提供不包含具体事实的 Golden 风格说明 / Rubric。
- 模型输入新增或强化 `current_day_fact_whitelist`，强调当前日期事实只能来自 payload。
- 增加外来事实 warning 检查。
- `temperature` 从 `0.2` 调整为 `0.1`，优先保证记录型生成的稳定性和事实边界。
- 增加轻量后处理：规范 `🌇：下午我` / `🌃：晚上我` 为 `🌇：我下午` / `🌃：我晚上`。

### 回归测试

| 日期 | 输出文件 | 检查重点 | 当前状态 |
|---|---|---|---|
| 2026-06-05 | `docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-v16-run-1.md` | 是否仍有 Golden 外来事实污染 | 无外来事实污染；一天回顾略短 |
| 2026-06-05 | `docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-v16-run-2.md` | 是否仍有 Golden 外来事实污染 | 无外来事实污染；关键词略有差异 |
| 2026-06-05 | `docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-v16-run-3.md` | 是否仍有 Golden 外来事实污染 | 通过；warnings 为空 |

### 当前结论

V1.6 已修复最关键的 Golden Reference 事实污染问题。三次 2026-06-05 连续生成均未再出现 6.1-6.4 的外来事实，结构、分段和段落组织保持稳定。后续如果继续提升质量，可进入 V1.7：增强一天回顾信息密度评分或增加轻量重试策略。

## V1.5

更新时间：2026-06-06

### 修复背景

页面生成 2026 年 6 月 5 日「一天之旅」时，出现同一时段内每条 event 被单独拆成一个段落的问题。结果阅读起来像日历流水账，不像 Golden md 中相邻、连续、主题相关记录合并成自然段的「一天之旅」风格。

### 修改内容

- 将系统提示词标题升级为 `稳定版 V1.5`。
- 增加段落组织硬约束。
- 明确同一时段内禁止一条时间记录一个段落。
- 明确每个时段正文通常控制在 1 到 4 个自然段。
- 明确相邻、连续、主题相关记录应合并为自然段。
- 明确只有主题明显变化、时间间隔较长、饭点 / 午休 / 外出 / 晚间切换时才新开段落。
- 保留 V1.4 的两个中文全角空格缩进规则。

### 接口配套修改

- `/api/ai/day-journey` 的 `promptVersion` 升级为 `day-journey-system-prompt-v1.5`。
- 接口 user message 增加 V1.5 段落组织提醒。
- 前端 payload 的 `options.promptVersion` 同步为 `day-journey-system-prompt-v1.5`，便于保存和追踪。

### 回归测试

| 日期 | 输出文件 | 检查重点 | 当前状态 |
|---|---|---|---|
| 2026-06-05 | `docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-v2.md` | 下午段落是否仍一条 event 一个段落 | 段落组织通过；一天回顾仍有轻微格式 warning |

### 当前结论

V1.5 已修复 2026-06-05 下午“一条 event 一个段落”的主要 Badcase：下午正文从多段流水账合并为 1 个自然段。当前仍观察到一个轻微格式问题：模型会写 `🌇：下午我` / `🌃：晚上我`，接口会返回一天回顾格式 warning，后续可单独继续收紧。

## V1.4

更新时间：2026-06-06

### 修复背景

「一天之旅」正文需要保持类似正式日记 / 时间账本的排版风格。此前提示词只写了“优先使用全角缩进”，约束不够强，导致 AI 生成结果可能缺少正文段落首行缩进。

### 修改内容

- 将系统提示词标题升级为 `稳定版 V1.4`。
- 增加段落首行缩进硬约束。
- 明确所有正文段落必须以两个中文全角空格 `　　` 开头。
- 明确适用范围：
  - 关键词段落。
  - 早上 / 下午 / 晚上正文段落。
  - 每个时段末尾的 `◆` 阶段归纳段落。
  - `### 一天回顾` 下的 ☀️ / 🌇 / 🌃 三段回顾。
- 明确不适用范围：
  - `## 日期标题`。
  - `### ☀️早上`、`### 🌇下午`、`### 🌃晚上`、`### 一天回顾`。
  - 空行。
- 明确不能使用普通半角空格代替中文全角空格。

### 接口配套修改

- `/api/ai/day-journey` 的 `promptVersion` 升级为 `day-journey-system-prompt-v1.4`。
- 接口 user message 增加 V1.4 缩进提醒。
- 接口 warnings 增加正文段落缩进检查：如果正文行没有以 `　　` 开头，会返回格式提醒。

### 回归测试

| 日期 | 输出文件 | warnings | 缩进检查 |
|---|---|---|---|
| 2026-06-04 | `docs/ai-day-journey/test-results/2026-06-04-generated-day-journey-v4.md` | `[]` | 通过 |

### 当前结论

V1.4 已完成正文段落首行缩进规范修复。复制 Markdown 和下载 `.md` 仍保留原始 Markdown 缩进。

## V1.3

更新时间：2026-06-06

### 修复背景

6 月 1 日和 6 月 2 日 Golden Set 泛化回归测试未通过：

- 6.1 关键词过泛。
- 6.1 午饭后分段与 Golden 不一致。
- 6.1 阶段归纳过粗。
- 6.1 一天回顾事实遗漏。
- 6.2 缺少 `### 一天回顾`。
- 6.2 关键词遗漏 Learn Claude Code、6 月规划、Agent 专项归档、Trae、Supabase、CodeX、AI PRD、浏览器插件等主线。
- 6.2 把“帮老爸弄照片”错误写成“老爸生日”。
- 6.2 晚上归纳过粗。

### 修改内容

- 将系统提示词标题升级为 `稳定版 V1.3`。
- 新增 V1.3 最高优先规则。
- 强化完整结构要求，明确 `### 一天回顾` 不允许缺失。
- 强化关键词抽取规则，补充 6.1 / 6.2 / 6.3 / 6.4 的关键词粒度示例。
- 强化事实不得改写规则，明确“帮老爸弄照片”不能写成“老爸生日”。
- 强化午饭后分段规则，明确 6.1 从 `11:30` 午饭开始进入下午。
- 强化 `◆` 阶段归纳粒度，禁止只写“日常、复盘、项目”。
- 强化一天回顾事实覆盖，要求三段第一人称必须覆盖关键事实。

### 接口配套修改

- `/api/ai/day-journey` 的 `promptVersion` 升级为 `day-journey-system-prompt-v1.3`。
- 输入构造新增 / 强化：
  - `rawTitle`
  - `rawDescription`
  - `suggestedSegment`
  - `mustKeepFacts`
- 6 月 1 日和 6 月 2 日加入后台 Golden Reference 命中范围。
- 接口内部统一使用后台 promptVersion 常量，避免前端旧 payload 版本号影响模型输入。

### 回归测试

| 日期 | 输出文件 | warnings | Golden 对比 |
|---|---|---|---|
| 2026-06-01 | `docs/ai-day-journey/test-results/2026-06-01-generated-day-journey-v2.md` | `[]` | 通过 |
| 2026-06-02 | `docs/ai-day-journey/test-results/2026-06-02-generated-day-journey-v2.md` | `[]` | 通过 |

### 当前结论

V1.3 已修复 6.1 / 6.2 已知 Golden Set Badcase。下一步仍建议先观察 4 个 Golden Case 的稳定性，再进入复制、下载、保存等后续功能。
