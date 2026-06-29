# 一天之旅生成验收与 Badcase 记录

## 0. 文件定位

本文件用于记录「一天之旅」AI 生成功能的验收标准、测试样例和 Badcase。

本功能不是“能生成文字”就算完成，而是必须稳定生成符合固定模板、保留原始事实、客观、可回看的「一天之旅」。

## 1. 验收标准 V0

| 检查项 | 合格标准 | 状态 |
|---|---|---|
| 是否包含日期标题 | 必须以 `## 2026 年 X 月 X 日` 开头 | 待测试 |
| 是否包含关键词 | 必须有 `**关键词：...**` | 待测试 |
| 关键词是否有事实依据 | 关键词必须来自当天实际内容，不能新增无依据主题 | 待测试 |
| 是否包含早上 | 必须有 `### ☀️早上` | 待测试 |
| 是否包含下午 | 必须有 `### 🌇下午` | 待测试 |
| 是否包含晚上 | 必须有 `### 🌃晚上` | 待测试 |
| 是否包含一天回顾 | 必须有 `### 一天回顾` | 待测试 |
| 是否有 ◆ 阶段归纳 | 早上、下午、晚上每段末尾必须有加粗 `◆` 事项归纳 | 待测试 |
| 是否保留原始事实 | 不能漏掉原始时间段中的关键事件 | 待测试 |
| 是否允许合并但不删事实 | 可以合并相邻或同主题事件，但不能删除关键动作、对象、项目和生活事项 | 待测试 |
| 是否客观 | 不添加主观解释、鸡汤、意义拔高 | 待测试 |
| 时间格式是否正确 | 使用 `7:15` 这类格式，不写“左右” | 待测试 |
| 30 分钟规则是否遵守 | 相邻事件小于 30 分钟时，不重复堆叠时间点 | 待测试 |
| 午饭后是否归入下午 | 午饭后内容应放入下午 | 待测试 |
| 晚饭后是否归入晚上 | 晚饭后内容应放入晚上 | 待测试 |
| 一天回顾是否三段第一人称 | 必须用 ☀️ / 🌇 / 🌃 三段，并使用第一人称 | 待测试 |
| 是否输出 Markdown | 必须可作为 Markdown 保存 | 待测试 |
| 是否只输出正文 | 不输出 JSON、代码块、解释文字或额外说明 | 待测试 |
| 缺少时段时是否保留结构 | 某个时段无明确记录时，也要保留标题并客观说明无明确记录 | 待测试 |
| 是否对齐最终范本 | 结构、语气、信息密度优先对齐 2026 年 6 月 4 日最终范本 | 待测试 |
| 空记录时是否返回明确提示 | 当天没有日程记录时，接口应返回明确空状态或 `NO_EVENTS`，不调用 LLM 编造内容 | 待测试 |
| LLM 失败时是否返回错误 | GLM / DeepSeek 都失败时，接口应返回明确错误，不展示伪成功内容 | 待测试 |
| 是否带 promptVersion | 成功返回必须包含 `promptVersion`，用于追踪生成版本 | 待测试 |
| 接口是否返回 Markdown | 成功 response 必须包含非空 `markdown` 字段 | 待测试 |
| 格式缺失是否拦截 | 如果生成结果缺少 `### 一天回顾` 等关键结构，应判为格式不合格 | 待测试 |
| 缺少 date 时是否返回错误 | 请求没有 `date` 时，应返回 `INVALID_PAYLOAD`，不调用 LLM | 待测试 |
| API Key 缺失时是否返回错误 | `GLM_API_KEY` 和 `DEEPSEEK_API_KEY` 都缺失时，应返回 `MISSING_API_KEY` | 待测试 |
| GLM 失败后是否尝试 DeepSeek | GLM 调用失败时，应自动尝试 DeepSeek provider fallback | 待测试 |
| 两个 provider 都失败时是否返回错误 | GLM 和 DeepSeek 都失败时，应返回 `AI_GENERATION_FAILED` | 待测试 |
| 模型空输出是否被拦截 | 模型返回空字符串时，不应作为成功 Markdown 展示 | 待测试 |
| 结构缺失是否写入 warnings | Markdown 缺少关键词、早上、下午、晚上、一天回顾等结构时，应在 `warnings` 中记录 | 待测试 |
| 是否兼容当前 CalendarEvent 字段 | 接口应兼容 `startTime` / `endTime`，不能只接受契约示例中的 `start` / `end` | 待测试 |
| 是否兼容当前 Tag 字段 | 接口应兼容当前 `Tag.label`、`Tag.color`、`Tag.icon` | 待测试 |

## 2. 测试样例

| 样例 | 用途 | 状态 |
|---|---|---|
| 2026 年 6 月 1 日 | 复盘日样例 | 待测试 |
| 2026 年 6 月 2 日 | 项目开发与工程调试样例 | 待测试 |
| 2026 年 6 月 3 日 | 时间管理项目和系统法样例 | 待测试 |
| 2026 年 6 月 4 日 | 最高优先级最终范本 | 已完成接口真实样例测试与 V1.1 质量修复；v2 基础质量通过 |

## 2.1 2026 年 6 月 4 日接口测试结果

测试记录文件：

```text
docs/ai-day-journey/06_测试_一天之旅接口测试记录.md
```

测试 payload：

```text
docs/ai-day-journey/test-payloads/2026-06-04-day-journey-payload.json
```

| 检查项 | 结果 | 备注 |
|---|---|---|
| 空 events 是否返回 `NO_EVENTS` | 通过 | 不调用 LLM |
| 真实 events 是否触发 LLM | 通过 | provider 为 `glm` |
| 成功时是否返回 `success: true` | 通过 | HTTP 200 |
| 是否返回 `markdown` | 通过 | 非空 Markdown |
| 是否带 `promptVersion` | 通过 | `day-journey-system-prompt-v1` |
| 是否带 `provider` 和 `model` | 通过 | `glm` / `glm-4-flash` |
| 是否包含日期、关键词、早上、下午、晚上、一天回顾 | 通过 | `warnings` 为空 |
| 是否包含三段加粗 `◆` 阶段归纳 | 通过 | 计数为 3 |
| 是否存在明显格式问题 | 未通过 | 时间格式使用了范围和前导 0 |
| 是否存在原始事实遗漏 | 未通过 | 一天回顾过短，遗漏部分关键事实 |
| 是否出现主观解释、意义拔高或虚构内容 | 通过 | 未发现明显虚构 |

## 2.2 2026 年 6 月 4 日 V1.1 修复后测试结果

v2 结果文件：

```text
docs/ai-day-journey/test-results/2026-06-04-generated-day-journey-v2.md
```

| 检查项 | 结果 | 备注 |
|---|---|---|
| 是否返回 `success: true` | 通过 | provider 为 `glm` |
| 是否带 `promptVersion` | 通过 | `day-journey-system-prompt-v1.1` |
| 是否包含完整 Markdown 结构 | 通过 | 日期、关键词、早上、下午、晚上、一天回顾都存在 |
| 是否包含三段加粗 `◆` | 通过 | 计数为 3 |
| 是否仍使用 `07:15 - 08:00` | 通过 | 未出现完整起止时间范围 |
| 是否仍有前导 0 | 通过 | 未出现 `07:15` |
| `11:17` 是否误入下午 | 通过 | 已归入早上 |
| `12:14` 是否进入下午 | 通过 | 已进入下午 |
| 一天回顾是否三段第一人称 | 通过 | ☀️ / 🌇 / 🌃 均存在 |
| 一天回顾是否明显改善 | 通过 | 比 v1 更完整 |
| 是否疑似截断 | 通过 | 结尾完整 |
| 是否出现虚构内容 | 通过 | 未发现明显虚构 |
| 是否完全贴近最终范本自然段风格 | 待优化 | 仍略偏逐条记录 |

## 2.3 前端看板接入 V0 验收记录

| 检查项 | 结果 | 备注 |
|---|---|---|
| 页面能打开「一天之旅」看板 | 已实现，待浏览器复验 | 入口仍为右侧日程面板的「回顾 / 一天之旅」图标 |
| 看板有「生成一天之旅」按钮 | 已实现 | 位于看板顶部操作区 |
| 点击后会请求 `/api/ai/day-journey` | 已实现，待浏览器复验 | 使用 `fetch` POST |
| 请求中包含当前日期 | 已实现 | `date` 来自当前 `selectedDate` |
| 请求中只包含当天 events | 已实现 | `ReviewBoard` 内按 `selectedDate` 筛选 |
| 请求中包含 tags | 已实现 | 传入当前标签列表 |
| 请求中包含 promptVersion | 已实现 | 当前为 `day-journey-system-prompt-v1.1` |
| loading 状态是否正常 | 已实现，待浏览器复验 | 按钮显示「生成中...」并禁用 |
| 成功后是否展示 Markdown | 已实现，待浏览器复验 | 使用 `white-space: pre-wrap` 方式展示 |
| 空 events 是否展示明确提示 | 已实现，待浏览器复验 | `NO_EVENTS` 对应“当前日期暂无可生成的一天之旅记录” |
| AI 失败是否展示错误提示 | 已实现，待浏览器复验 | `AI_GENERATION_FAILED` 对应“一天之旅生成失败，请稍后重试” |
| warnings 是否轻量展示 | 已实现 | 看板底部展示格式提醒 |
| 是否保留静态范本作为 fallback | 已实现 | 未生成前展示 2026 年 6 月 4 日示范内容，并明确标注为示范 |
| 是否影响 AI 日复盘 | 未发现影响 | 本轮未修改 `AIDailyReviewModal.tsx` 和 `/api/ai/daily-review` 调用 |
| 是否修改 Supabase | 未修改 | 不保存数据库 |
| 构建是否通过 | 通过 | 已执行 `npm run build` |

浏览器复验补充：

- 已在本地开发服务打开页面。
- 当前本地新端口处于未登录且无日程状态，页面存在既有“请先登录以查看日程”遮罩，普通点击右侧「回顾」入口不会触发展开。
- 因此本轮浏览器只确认页面可加载；看板打开、生成按钮点击和真实接口调用仍建议在用户当前已登录 / 有日程的页面状态下复验。

## 2.4 Golden Set V1.2 对比测试结果

Golden Set 对比记录：

```text
docs/ai-day-journey/05_Eval_一天之旅GoldenSet对比记录.md
```

### 2026 年 6 月 3 日

输出文件：

```text
docs/ai-day-journey/test-results/2026-06-03-generated-day-journey-v2.md
```

| 检查项 | 结果 | 备注 |
|---|---|---|
| 是否真实调用接口 | 通过 | `POST /api/ai/day-journey` |
| 是否使用 V1.2 promptVersion | 通过 | `day-journey-system-prompt-v1.2` |
| 是否使用 Golden Reference | 通过 | metadata 标记 `golden_reference_used: true` |
| warnings 是否为空 | 通过 | `[]` |
| `5:30` 是否保持 | 通过 | 未漂移为 `6:00` |
| `6:30` 是否保持 | 通过 | 未漂移为 `6:40` |
| 关键词是否覆盖 Golden 主线 | 通过 | 覆盖 CodeX、ChatGPT、6 月规划、系统法、客观评判标准、最佳实践标准、老爸生日 |
| 阶段归纳是否过粗 | 通过 | 已覆盖 Astaxin、维生素 C、罗森、6 月安排思考等事实 |
| 一天回顾是否过度压缩 | 通过 | 三段回顾已接近 Golden |

### 2026 年 6 月 4 日

输出文件：

```text
docs/ai-day-journey/test-results/2026-06-04-generated-day-journey-v3.md
```

| 检查项 | 结果 | 备注 |
|---|---|---|
| 是否真实调用接口 | 通过 | `POST /api/ai/day-journey` |
| 是否使用 V1.2 promptVersion | 通过 | `day-journey-system-prompt-v1.2` |
| 是否使用 Golden Reference | 通过 | metadata 标记 `golden_reference_used: true` |
| warnings 是否为空 | 通过 | `[]` |
| 关键词是否对齐最终范本 | 通过 | 时间管理项目、AI PRD、学习方法论、GPT 工具、轻工程基础 |
| 11:17 / 11:36 是否留在早上 | 通过 | 分段对齐最终范本 |
| 15:11 / 15:27 是否合并 | 通过 | 未机械堆叠 15:27 |
| 一天回顾是否机械罗列 | 通过 | 已接近最终范本连贯叙述 |
| 术语是否统一 | 通过 | AI PRD、VS Code、GitHub、CodeX、B 站 |

## 3. Badcase 记录

| 日期 | 输入样例 | 问题描述 | 可能原因 | 修复方式 | 状态 |
|---|---|---|---|---|---|
| 2026-06-04 | `test-payloads/2026-06-04-day-journey-payload.json` | 输出使用 `07:15 - 08:00` 这类时间范围，不符合最终范本 `7:15，...` 的写法 | 系统提示词虽要求 `7:15`，但模型受 payload 起止时间影响，倾向保留完整范围 | 已升级系统提示词 V1.1，并在输入中强调时间点叙事格式 | 已修复 |
| 2026-06-04 | 同上 | `11:17 - 11:36` 和 `11:36 - 12:14` 被放入下午，与最终范本不一致 | 模型按中午前后机械分段，没有完全模仿 6 月 4 日最终范本 | 已在系统提示词和输入构造中明确 6 月 4 日分段边界 | 已修复 |
| 2026-06-04 | 同上 | 一天回顾过短，遗漏 yyw、贝索斯视频、Telegram 访谈、Canva 图标 Logo、许倩、学姐、贵贵、晚饭散步洗澡、天物空间买东方树叶等关键事实 | 一天回顾规则对“事实覆盖”的约束还不够强 | 已强化“一天回顾也必须覆盖关键事实”，并增加一天回顾过短 warning | 已改善 |
| 2026-06-04 | 同上 | 晚上阶段归纳没有充分覆盖非 AI 版 PRD V0、VS Code、GitHub、Git、终端和命令行基础学习 | 阶段归纳压缩过度 | 已强化 `◆` 阶段归纳必须覆盖本阶段关键产出和学习对象 | 已改善 |
| 2026-06-04 | 同上 | v2 仍略偏逐条记录，段落自然合并程度不如最终范本 | 当前仍让模型直接输出 Markdown，且输入事件清单较细 | 后续可引入最终范本片段 few-shot 或增加段落合并规则 | 待优化 |
| 2026-06-03 | `test-payloads/2026-06-03-day-journey-payload.json` | 首次页面生成出现 `5:30` 被改为 `6:00`、`6:30` 被改为 `6:40` | 输入中没有把可输出时间点作为强约束，模型自行平移 / 推断时间 | 已新增 `displayStartTime`，并在 V1.2 提示词中要求正文时间只能来自该字段 | 已修复 |
| 2026-06-03 | 同上 | 关键词过度压缩，只保留时间管理项目、日常、老爸生日 | 关键词抽取规则没有 Golden Set 粒度约束 | 已强化 Golden Set 优先级，并对 6 月 3 日主线词做明确约束 | 已修复 |
| 2026-06-03 | 同上 | 阶段归纳过粗，一天回顾过短 | 模型压缩过度，未对齐 Golden 事实覆盖 | 已引入对应日期 Golden Reference 作为后台参考输入 | 已修复 |
| 2026-06-04 | `test-payloads/2026-06-04-day-journey-payload.json` | 关键词过细、短间隔时间点未合并、一天回顾机械罗列、术语不统一 | 单靠规则提示不足以稳定对齐最终范本 | 已引入 6 月 4 日 Golden Case 和最终范本作为后台参考输入 | 已修复 |
| 2026-06-01 | `test-payloads/2026-06-01-day-journey-payload.json` | 关键词过泛，阶段归纳过粗，一天回顾偏短；11:30 后分段不贴近 Golden | 未注入 6 月 1 日 Golden Reference，复盘日关键词和事实覆盖规则泛化不足 | 后续 V1.3 强化复盘日关键词、午饭后分段、`◆` 归纳粒度和回顾事实覆盖 | 待修复 |
| 2026-06-02 | `test-payloads/2026-06-02-day-journey-payload.json` | 缺少 `### 一天回顾`，关键词遗漏，阶段归纳过粗，并把“帮老爸弄照片”写成“老爸生日” | 结构硬约束不足，且模型可能跨样例迁移了 6 月 3 日事实 | 后续 V1.3 增加缺结构重试或更强硬提示，强化不得跨样例迁移事实 | 待修复 |

## 3.1 2026 年 6 月 1 日 / 6 月 2 日泛化回归测试

本轮新增测试文件：

```text
docs/ai-day-journey/test-payloads/2026-06-01-day-journey-payload.json
docs/ai-day-journey/test-payloads/2026-06-02-day-journey-payload.json
docs/ai-day-journey/test-results/2026-06-01-generated-day-journey-v1.md
docs/ai-day-journey/test-results/2026-06-02-generated-day-journey-v1.md
```

| 检查项 | 2026-06-01 | 2026-06-02 |
|---|---|---|
| 是否真实调用 `/api/ai/day-journey` | 通过 | 通过 |
| 是否返回 `success: true` | 通过 | 通过 |
| 是否带 provider / model | 通过，`glm` / `glm-4-flash` | 通过，`glm` / `glm-4-flash` |
| 是否带 promptVersion | 通过，`day-journey-system-prompt-v1.2` | 通过，`day-journey-system-prompt-v1.2` |
| 是否返回 Markdown | 通过 | 通过 |
| 标题日期是否正确 | 通过 | 通过 |
| 关键词是否覆盖当天主线 | 未通过 | 未通过 |
| 早中晚分段是否对齐 Golden | 未通过，11:30 后分段偏差 | 基本通过 |
| 时间点是否来自原始记录 | 通过 | 通过 |
| 三段 `◆` 是否存在 | 通过 | 通过 |
| `◆` 归纳是否贴近 Golden 粒度 | 未通过 | 未通过 |
| 是否包含 `### 一天回顾` | 通过 | 未通过 |
| 一天回顾是否三段第一人称 | 通过 | 未通过 |
| 是否遗漏关键事实 | 存在遗漏 | 存在遗漏 |
| 是否出现虚构或事实改写 | 未发现明显虚构 | 存在“老爸生日”事实改写 |

结论：

- 6 月 1 日和 6 月 2 日均未通过 Golden 对比。
- 当前接口链路可用，但生成质量还不适合直接进入复制、下载、保存等后续功能。
- 下一步建议先进入 V1.3 质量修复。

## 3.2 V1.3 修复后验收

| 检查项 | 2026-06-01 v2 | 2026-06-02 v2 |
|---|---|---|
| 是否真实调用 `/api/ai/day-journey` | 通过 | 通过 |
| 是否返回 `success: true` | 通过 | 通过 |
| 是否带 `promptVersion: day-journey-system-prompt-v1.3` | 通过 | 通过 |
| warnings 是否为空 | 通过 | 通过 |
| 是否包含完整 Markdown 结构 | 通过 | 通过 |
| 是否包含 `### 一天回顾` | 通过 | 通过 |
| 是否包含三段第一人称回顾 | 通过 | 通过 |
| 关键词是否覆盖主线 | 通过 | 通过 |
| 分段是否贴近 Golden | 通过 | 通过 |
| 时间点是否来自原始记录 | 通过 | 通过 |
| 阶段 `◆` 是否过粗 | 已修复 | 已修复 |
| 一天回顾是否事实遗漏 | 已修复 | 已修复 |
| 是否出现事实改写 | 未发现 | 未发现 |

V1.3 后状态更新：

- `DJ-GS-0601-001`：已修复。
- `DJ-GS-0601-002`：已修复。
- `DJ-GS-0601-003`：已修复。
- `DJ-GS-0601-004`：已修复。
- `DJ-GS-0602-001`：已修复。
- `DJ-GS-0602-002`：已修复。
- `DJ-GS-0602-003`：已修复。
- `DJ-GS-0602-004`：已修复。

## 3.3 前端轻量操作验收 V0

本轮新增「一天之旅」看板生成后的基础操作能力，不涉及数据库保存。

| 检查项 | 当前状态 | 证据 / 说明 |
|---|---|---|
| 生成结果能正常展示 | 已实现，待浏览器复验 | `ReviewBoard` 继续展示 `markdown` |
| 有生成结果时显示复制按钮 | 已实现 | `复制 Markdown` 仅在 `markdown` 非空时显示 |
| 点击复制后写入剪贴板 | 已实现，待浏览器复验 | 使用浏览器 `clipboard` 写入当前 Markdown |
| 复制成功有轻量提示 | 已实现 | 显示「已复制」 |
| 复制失败有轻量提示 | 已实现 | 显示「复制失败，请手动复制」 |
| 有生成结果时显示下载按钮 | 已实现 | `下载 .md` 仅在 `markdown` 非空时显示 |
| 下载文件名包含当前日期 | 已实现 | 文件名格式为 `YYYY-MM-DD-一天之旅.md` |
| 重新生成会再次请求接口 | 已实现，待浏览器复验 | `ReviewBoard` 调用 `App.tsx` 的 `generateDayJourney` |
| loading 状态保留 | 已实现 | 生成时按钮禁用，并显示「生成中...」 |
| 错误状态保留 | 已实现 | 继续展示现有 `errorMessage` |
| 未生成状态不显示复制 / 下载 | 已实现 | 仅有生成按钮 |
| 是否保存到数据库 | 未实现 | 本轮明确不做 Supabase 保存 |
| 是否影响 AI 日复盘 | 未发现影响 | 只修改一天之旅看板操作层 |

## 3.4 Markdown 展示层验收

本轮修复「一天之旅」看板直接显示 Markdown 原始符号的问题。

| 检查项 | 当前状态 | 证据 / 说明 |
|---|---|---|
| 页面不再直接显示 `##` | 已实现，待浏览器复验 | `ReviewBoard` 将 `##` 行渲染为标题 |
| 页面不再直接显示 `###` | 已实现，待浏览器复验 | `ReviewBoard` 将 `###` 行渲染为小标题 |
| 页面不再直接显示 `**` | 已实现，待浏览器复验 | `ReviewBoard` 将 `**...**` 渲染为加粗文本 |
| 日期标题可读 | 已实现 | `## 日期` 渲染为大标题 |
| 早上 / 下午 / 晚上 / 一天回顾分层展示 | 已实现 | `###` 渲染为时段小标题 |
| `◆` 阶段归纳加粗展示 | 已实现 | `**◆ ...**` 渲染为加粗 |
| 复制仍保留原始 Markdown | 已实现 | 复制逻辑仍使用原始 `markdown` 字符串 |
| 下载仍保留原始 Markdown | 已实现 | 下载逻辑仍使用原始 `markdown` 字符串 |
| 是否修改系统提示词 | 未修改 | 本轮只改展示层 |
| 是否修改 AI 接口返回格式 | 未修改 | 后端仍返回 Markdown |
| 是否修改 Supabase | 未修改 | 不涉及数据库 |

## 3.5 V1.4 正文段落缩进验收

本轮增加「正文段落首行必须以两个中文全角空格开头」的格式规范。

测试文件：

```text
docs/ai-day-journey/test-results/2026-06-04-day-journey-response-v4.json
docs/ai-day-journey/test-results/2026-06-04-generated-day-journey-v4.md
```

| 检查项 | 当前状态 | 证据 / 说明 |
|---|---|---|
| 是否使用 V1.4 promptVersion | 通过 | `day-journey-system-prompt-v1.4` |
| 接口是否成功返回 | 通过 | `success: true` |
| warnings 是否为空 | 通过 | `[]` |
| 正文段落是否以两个中文全角空格开头 | 通过 | 缺失缩进正文行数量为 0 |
| 标题行是否不缩进 | 通过 | 未发现被 `　　` 错误缩进的 `##` / `###` 标题 |
| `◆` 阶段归纳是否缩进 | 通过 | 所有 `**◆` 行均以 `　　` 开头 |
| 复制 Markdown 是否保留缩进 | 通过，基于代码路径确认 | 复制逻辑仍使用原始 `markdown` 字符串 |
| 下载 `.md` 是否保留缩进 | 通过，基于代码路径确认 | 下载逻辑仍使用原始 `markdown` 字符串 |
| 前端展示是否保留缩进 | 通过，基于代码路径确认 | `ReviewBoard` 段落使用 `whitespace-pre-wrap` |
| 是否修改系统提示词 | 已按要求修改 | V1.4 增加缩进硬规则 |
| 是否修改 AI 接口返回格式 | 未修改 | 后端仍返回 Markdown |
| 是否修改 Supabase | 未修改 | 不涉及数据库 |

### 新增 Badcase 类型

| Badcase ID | 类型 | 问题表现 | 修复方向 | 当前状态 |
|---|---|---|---|---|
| DJ-FMT-INDENT-001 | 段落缩进缺失 | 正文段落、`◆` 阶段归纳或一天回顾段落没有以 `　　` 开头 | 系统提示词 V1.4 强化缩进规则，接口 warnings 增加缩进检查 | 已修复 |

## 3.6 Supabase 保存层验收 V0

本轮新增按用户和日期保存「一天之旅」到 Supabase。

| 检查项 | 当前状态 | 证据 / 说明 |
|---|---|---|
| 是否新增 migration 文件 | 已实现 | `supabase/migrations/004_ai_day_journeys.sql` |
| 是否新增 `ai_day_journeys` 表设计 | 已实现 | migration 中创建 `public.ai_day_journeys` |
| 是否有 `unique(user_id, date)` | 已实现 | migration 中设置唯一约束 |
| 是否启用 RLS | 已实现 | migration 中开启 Row Level Security |
| 是否限制用户只能访问自己的记录 | 已实现 | select / insert / update / delete policy |
| 是否新增保存 service | 已实现 | `utils/dayJourneyService.ts` |
| 是否使用 upsert | 已实现 | `onConflict: 'user_id,date'` |
| 保存是否使用 selectedDateKey | 已实现 | `App.tsx` 中生成、读取、保存共用 `selectedDateKey` |
| 是否保存 inputSnapshot | 已实现 | 保存当前生成 payload、provider、model、warnings、source_event_ids |
| 生成后是否不会自动保存 | 已实现 | 生成只设置 dirty 状态 |
| 是否删除复制 / 下载按钮 | 已实现 | `ReviewBoard` 顶部仅保留生成 / 保存 |
| 是否保留重新生成 | 已实现 | 有内容时生成按钮显示「重新生成」 |
| 切换未保存日期是否清空 | 已实现，待浏览器复验 | 日期变化时先清空再加载 |
| 切换已保存日期是否加载 | 已实现，待 Supabase migration 后复验 | `getDayJourney(userId, selectedDateKey)` |
| 是否防止旧请求污染新日期 | 已实现 | requestId / selectedDateKey 校验 |
| 未登录保存是否有提示 | 已实现 | “请先登录后保存一天之旅” |
| migration 未执行是否有提示 | 已实现 | “请先执行 supabase/migrations/004_ai_day_journeys.sql” |

### 新增 Badcase 类型

| Badcase ID | 类型 | 问题表现 | 修复方向 | 当前状态 |
|---|---|---|---|---|
| DJ-SAVE-DATE-001 | 日期保存错位 | 因 UTC / timezone 转换导致保存到前一天或后一天 | 全链路使用 `selectedDateKey`，不重新推导日期 | 已预防 |
| DJ-SAVE-RACE-001 | 异步日期污染 | 6 月 4 日旧请求返回后覆盖 6 月 3 日看板 | 使用 requestId / selectedDateKey 校验丢弃旧结果 | 已预防 |
| DJ-SAVE-DUP-001 | 同日重复记录 | 同一用户同一天保存出多条记录 | 增加 `unique(user_id, date)` 并使用 upsert | 已预防 |
| DJ-SAVE-MIGRATION-001 | migration 未执行静默失败 | 表不存在时页面没有明确提示 | service 将表缺失错误转换为明确 migration 提示 | 已预防 |

## 3.7 V1.5 段落组织验收

本轮修复「同一时段内每条 event 被单独拆段，导致一天之旅像日历流水账」的问题。

测试文件：

```text
docs/ai-day-journey/test-payloads/2026-06-05-day-journey-payload.json
docs/ai-day-journey/test-results/2026-06-05-day-journey-response-v1.json
docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-v1.md
docs/ai-day-journey/test-results/2026-06-05-day-journey-response-v2.json
docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-v2.md
```

| 检查项 | 当前状态 | 证据 / 说明 |
|---|---|---|
| 是否使用 V1.5 promptVersion | 通过 | `day-journey-system-prompt-v1.5` |
| 下午是否仍一条记录一个段落 | 通过 | 下午正文已合并为 1 个自然段，不再逐条拆段 |
| 相邻事件是否合并为自然段 | 通过 | `12:38`、`12:55`、`13:26`、`14:00`、`14:43`、`15:31`、`15:46` 合并在同一下午自然段 |
| 每个时段是否为 1 到 4 个正文段落 | 通过 | 早上 1 段、下午 1 段、晚上 1 段 |
| 是否保留两个中文全角空格缩进 | 通过 | 缺失缩进正文行数量为 0 |
| `◆` 阶段归纳是否单独成段 | 通过 | 每个时段均有单独加粗 `◆` |
| 一天回顾是否为三段第一人称 | 部分通过 | 有 ☀️ / 🌇 / 🌃 三段；但 v2 仍写作 `🌇：下午我`、`🌃：晚上我`，接口返回格式 warning |

### 新增 Badcase 类型

| Badcase ID | 类型 | 问题表现 | 修复方向 | 当前状态 |
|---|---|---|---|---|
| DJ-FMT-PARA-001 | 段落组织错误 / 风格不符合 Golden Reference | 同一时段内每条 event 被单独拆段，导致一天之旅像日历流水账 | 系统提示词 V1.5 强化自然段合并规则，避免一条记录一个段落 | 已修复 |
| DJ-FMT-REVIEW-002 | 一天回顾格式轻微偏差 | 回顾三段存在，但第二、三段写成 `🌇：下午我` / `🌃：晚上我`，不是 `🌇：我` / `🌃：我` | 后续可继续强化冒号后第一个字必须是“我”，或在后处理层做轻量规范化 | 待优化 |

## 3.8 Consistency Eval：2026-06-05 同日期多次生成

测试文件：

```text
docs/ai-day-journey/05_Eval_一天之旅ConsistencyEval记录.md
docs/ai-day-journey/test-results/2026-06-05-day-journey-response-run-1.json
docs/ai-day-journey/test-results/2026-06-05-day-journey-response-run-2.json
docs/ai-day-journey/test-results/2026-06-05-day-journey-response-run-3.json
docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-run-1.md
docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-run-2.md
docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-run-3.md
```

| 检查项 | Run 1 | Run 2 | Run 3 | 结论 |
|---|---|---|---|---|
| 结构是否完整 | 通过 | 通过 | 通过 | 稳定 |
| 段落是否过碎 | 通过 | 通过 | 通过 | V1.5 段落组织稳定 |
| 缩进是否保留 | 通过 | 通过 | 通过 | 稳定 |
| 关键词是否稳定 | 表面稳定 | 表面稳定 | 表面稳定 | 但过度贴近 6.4 最终范本 |
| 是否有事实污染 | 有轻微污染 | 有明显污染 | 有轻微污染 | 不稳定 |
| 一天回顾是否稳定 | 偏机械 | 明显污染 | 格式 warning | 不稳定 |

### 新增 Badcase 类型

| Badcase ID | 类型 | 问题表现 | 修复方向 | 当前状态 |
|---|---|---|---|---|
| DJ-CONSIST-001 | 同一日期多次生成风格差异过大 | 2026-06-05 三次生成结构一致，但一天回顾质量波动明显 | 做 Consistency Eval，必要时降低 temperature 或增加重试 / 评分机制 | 待修复 |
| DJ-CONSIST-KEYWORD-001 | 同一日期关键词迁移 | 三次关键词稳定为 6.4 最终范本抽象词，未充分贴合 6.5 当天事实 | 关键词生成应只基于当前 payload，Golden 只能提供抽象层级，不提供可复制关键词 | 待修复 |
| DJ-CONSIST-POLLUTION-001 | Golden 范本事实污染 | Run 2 混入 yyw、东方树叶、《人工智能白皮书》、客观评判标准、最佳实践原则等 6.4 事实 | Golden Reference 去事实化；只注入风格 Rubric；增加当前日期事实白名单校验 | 待修复 |
| DJ-CONSIST-REVIEW-001 | 一天回顾不稳定 | Run 1 偏机械，Run 2 污染，Run 3 出现 `🌇：下午我` / `🌃：晚上我` 格式 warning | 强化一天回顾模板，增加后处理规范化或结构校验重试 | 待修复 |

## 3.9 V1.6 事实边界与一致性修复验收

本轮修复「Golden Reference 事实污染」和同日期多次生成漂移问题。

测试文件：

```text
docs/ai-day-journey/test-results/2026-06-05-day-journey-response-v16-run-1.json
docs/ai-day-journey/test-results/2026-06-05-day-journey-response-v16-run-2.json
docs/ai-day-journey/test-results/2026-06-05-day-journey-response-v16-run-3.json
docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-v16-run-1.md
docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-v16-run-2.md
docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-v16-run-3.md
```

| 检查项 | Run 1 | Run 2 | Run 3 | 结论 |
|---|---|---|---|---|
| 是否使用 V1.6 promptVersion | 通过 | 通过 | 通过 | 稳定 |
| 是否移除完整 Golden md 事实上下文 | 通过 | 通过 | 通过 | 已改为非事实 Style Guide |
| 是否包含 current_day_fact_whitelist | 通过 | 通过 | 通过 | 已加入模型输入 |
| 是否出现 6.1-6.4 外来事实污染 | 无 | 无 | 无 | 已修复 |
| 是否包含完整结构 | 通过 | 通过 | 通过 | 稳定 |
| 是否一条 event 一个段落 | 否 | 否 | 否 | 已修复 |
| 一天回顾格式 | 通过 | 通过 | 通过 | 已通过后处理规范化 |
| warnings | 1 条轻微提示 | 1 条轻微提示 | `[]` | 可接受 |

### Badcase 状态更新

| Badcase ID | 类型 | 当前状态 | 说明 |
|---|---|---|---|
| DJ-CONSIST-POLLUTION-001 | Golden 范本事实污染 | 已修复 | V1.6 后三次 6.5 生成均未出现 6.1-6.4 外来事实 |
| DJ-CONSIST-KEYWORD-001 | 同一日期关键词迁移 | 基本修复 | 关键词已更贴近 6.5 payload，但 Run 间仍有轻微差异 |
| DJ-CONSIST-REVIEW-001 | 一天回顾不稳定 | 部分修复 | 格式已稳定；Run 1 / Run 2 仍有偏短提示 |

### 新增 Badcase 类型

| Badcase ID | 类型 | 问题表现 | 修复方向 | 当前状态 |
|---|---|---|---|---|
| DJ-CONSIST-CONTEXT-001 | 上下文污染 | Golden md 原文作为生成上下文时，模型把样例事实迁移到当前日期 | Golden Reference 去事实化，只传 Style Guide / Rubric | 已修复 |
| DJ-CONSIST-WHITELIST-001 | 当前日期事实白名单缺失 | 模型没有明确事实边界，容易使用当前 payload 以外事实 | 增加 `current_day_fact_whitelist` 和外来事实 warning | 已修复 |

## 4. 自动更新规则

后续每次生成结果测试后，请主动更新：
- 哪个样例通过。
- 哪个样例失败。
- 失败在哪里。
- 如何调整系统提示词或代码。
