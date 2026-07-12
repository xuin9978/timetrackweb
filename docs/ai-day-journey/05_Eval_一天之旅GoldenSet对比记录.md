# 一天之旅 Golden Set 对比记录

## 0. 文件定位

本文件用于记录「一天之旅」AI 生成功能与 Golden Reference 的对比结果。

这里的 Golden Set 不是普通参考资料，而是后续 Prompt 迭代、接口输入构造、Eval、Badcase 复盘和作品集说明的核心标准。

## 1. Golden Set 范围

| 日期 | Golden 文件 | 用途 |
|---|---|---|
| 2026-06-01 | `docs/ai-day-journey/examples/2026年6月1日原始日历与一天之旅.md` | Golden Case |
| 2026-06-02 | `docs/ai-day-journey/examples/2026年6月2日原始日历与一天之旅.md` | Golden Case |
| 2026-06-03 | `docs/ai-day-journey/examples/2026年6月3日原始日历与一天之旅.md` | Golden Case |
| 2026-06-04 | `docs/ai-day-journey/examples/2026年6月4日时间记录与一天之旅.md` | Golden Case |
| 2026-06-04 | `docs/ai-day-journey/03_Golden_一天之旅最终范本.md` | 最高优先级格式模板 |

说明：

- `03_Golden_一天之旅最终范本.md` 是最高格式标准。
- 4 个 examples 是 input-output Golden Case。
- 生成时不要求逐字复制 Golden md，但应做到结构一致、事实覆盖一致、分段一致、风格接近。

## 2. 当前对比总览

| 日期 | Golden 文件 | 当前生成结果 | 主要差异 | Badcase 类型 | 修复方向 |
|---|---|---|---|---|---|
| 2026-06-03 | `examples/2026年6月3日原始日历与一天之旅.md` | 当前 GLM 生成版 | 时间点失真、关键词过少、阶段归纳过粗、一天回顾过短 | 时间事实错误 / 事实遗漏 / 过度压缩 | 优化输入构造和 Prompt |
| 2026-06-04 | `examples/2026年6月4日时间记录与一天之旅.md` + `03_Golden_一天之旅最终范本.md` | 当前 GLM 生成版 | 时间点过密、关键词层级不一致、一天回顾机械罗列、术语不统一 | 风格不一致 / 合并规则未生效 / 术语不统一 | 强化最终范本优先级和 Golden Set 规则 |

## 3. 2026-06-03 Badcase

### 3.1 时间点失真

Golden：

- `5:30，泡咖啡、泡茶、列待办事项。`
- `6:30，和 CodeX 对话...`

当前生成版：

- 写成 `6:00，泡咖啡、泡茶、列待办事项。`
- 写成 `6:40，和CodeX对话...`

判断：

- 这是事实错误，不能接受。
- 生成模型不得自行推算、平移、四舍五入或改写原始开始时间。

修复：

- 接口输入构造新增 `displayStartTime` / `displayEndTime`。
- 系统提示词 V1.2 明确：输出正文中的时间点只能来自 `displayStartTime`。

### 3.2 关键词过度压缩

Golden 关键词：

```text
时间管理项目、CodeX、ChatGPT、6 月规划、系统法、客观评判标准、最佳实践标准、老爸生日
```

当前生成版关键词：

```text
时间管理项目、日常、老爸生日
```

判断：

- 漏掉 CodeX、ChatGPT、6 月规划、系统法、客观评判标准、最佳实践标准。
- `日常` 过泛，不能替代当天主线。

修复：

- 系统提示词 V1.2 强化关键词不能过泛，也不能过碎。
- 对 6 月 3 日明确要求保留当天主线词。

### 3.3 阶段归纳过粗

当前生成版早上归纳：

```text
时间管理项目优化、对话分析、购物决策。
```

问题：

- 归纳太泛。
- 未覆盖 CodeX、ChatGPT、Astaxin 虾青素、6 月安排思考、罗森、维生素 C 等 Golden 关键事实。

修复：

- 系统提示词 V1.2 增加禁止使用过泛归纳词的规则。
- `◆` 阶段归纳必须覆盖关键项目、工具、生活事项和重要产出。

### 3.4 一天回顾过度压缩

问题：

- 当前生成版一天回顾只写高度概括主题。
- 漏掉 CodeX、ChatGPT、罗森、维生素 C、Astaxin、6 月规划、系统法、老爸生日等关键事实。

修复：

- 系统提示词 V1.2 要求一天回顾做到「连贯叙述 + 保留关键事实 + 不加主观意义拔高」。
- 对 6 月 3 日明确列出必须覆盖的关键事实。

## 4. 2026-06-04 Badcase

### 4.1 关键词层级不一致

最终范本关键词：

```text
时间管理项目、AI PRD、学习方法论、GPT 工具、轻工程基础
```

当前生成版问题：

- 关键词列得过细，例如 GPT、图标设计、AIPRD、最少必要知识包、客观评判标准、最佳实践原则、VS Code、Git、终端。

判断：

- 模型没有对齐最终范本的抽象层级。

修复：

- 系统提示词 V1.2 强化 6 月 4 日关键词应更接近最终范本抽象层级。

### 4.2 短间隔时间点未合并

最终范本：

- 会把 15:11 和 15:27 这类短间隔事件合并表达。

当前生成版：

- 仍逐条列出 15:11、15:27、16:34、16:54。

判断：

- 「相邻事件小于 30 分钟时可以合并，不重复堆时间点」规则未稳定生效。

修复：

- 系统提示词 V1.2 强化合并规则。
- 输入构造中继续保留 `displayStartTime`，但提醒模型只在关键推进处使用时间点。

### 4.3 一天回顾机械罗列

问题：

- 当前生成版一天回顾虽然事实较多，但更像把日程重新复制一遍。
- 最终范本的一天回顾应是连贯叙述，既保留关键事实，又不机械逐条堆叠。

修复：

- 系统提示词 V1.2 明确：一天回顾不能过度压缩，也不能机械复制日程。

### 4.4 术语风格不统一

当前生成版问题：

- `AIPRD` / `AI PRD`
- `VScode` / `VS Code`
- `Github` / `GitHub`

修复：

- 系统提示词 V1.2 新增术语标准写法：
  - `AI PRD`
  - `VS Code`
  - `GitHub`
  - `CodeX`
  - `ChatGPT`
  - `Canva`
  - `GPT`
  - `B 站`

## 5. V1.2 修复后待验证

| 日期 | 测试 payload | 输出文件 | 状态 |
|---|---|---|---|
| 2026-06-03 | `docs/ai-day-journey/test-payloads/2026-06-03-day-journey-payload.json` | `docs/ai-day-journey/test-results/2026-06-03-generated-day-journey-v2.md` | 已生成，warnings 为空 |
| 2026-06-04 | `docs/ai-day-journey/test-payloads/2026-06-04-day-journey-payload.json` | `docs/ai-day-journey/test-results/2026-06-04-generated-day-journey-v3.md` | 已生成，warnings 为空 |

## 6. V1.2 修复后对比结果

### 6.1 2026-06-03

修复后结果：

- 输出文件：`docs/ai-day-journey/test-results/2026-06-03-generated-day-journey-v2.md`
- provider：`glm`
- model：`glm-4-flash`
- promptVersion：`day-journey-system-prompt-v1.2`
- warnings：`[]`
- 已使用 Golden Reference。

已修复：

- 时间点失真已修复：`5:30`、`6:30` 保持 Golden 原始时间，没有被改成 `6:00` 或 `6:40`。
- 关键词过度压缩已修复：保留 `时间管理项目、CodeX、ChatGPT、6 月规划、系统法、客观评判标准、最佳实践标准、老爸生日`。
- 阶段归纳过粗已修复：早上 `◆` 覆盖 CodeX、罗森、维生素 C、ChatGPT、Astaxin 虾青素、6 月安排思考等关键事实。
- 一天回顾过短已修复：三段回顾覆盖早上、下午、晚上主要事实。

仍需观察：

- 当前 6 月 3 日输出已经高度接近 Golden。后续可继续用 6 月 1 日、6 月 2 日测试泛化能力。

### 6.2 2026-06-04

修复后结果：

- 输出文件：`docs/ai-day-journey/test-results/2026-06-04-generated-day-journey-v3.md`
- provider：`glm`
- model：`glm-4-flash`
- promptVersion：`day-journey-system-prompt-v1.2`
- warnings：`[]`
- 已使用 Golden Reference。

已修复：

- 关键词层级已对齐最终范本：`时间管理项目、AI PRD、学习方法论、GPT 工具、轻工程基础`。
- 短间隔时间点合并已修复：15:11 与后续短间隔事项合并表达，没有机械堆叠 15:27。
- 一天回顾机械罗列已修复：回顾变成连贯叙述，并保留关键事实。
- 术语写法已统一：`AI PRD`、`VS Code`、`GitHub`、`CodeX`、`B 站`。
- 早中晚分段已对齐最终范本：`11:17` 和饭前事项留在早上，`12:14` 进入下午，`18:15` 进入晚上。

仍需观察：

- 当前 6 月 4 日 v3 基本等同最终范本风格。后续需要确认 Golden Reference 只作为后台 few-shot / Eval 标准，不应让非 Golden 日期过度套用某一天的具体事实。

## 7. 2026-06-01 / 2026-06-02 泛化回归测试

本轮目标是验证当前 V1.2 系统提示词和 `displayStartTime / displayEndTime` 输入构造，在未直接注入对应日期 Golden Reference 的情况下，是否能泛化到 6 月 1 日和 6 月 2 日。

### 7.1 测试文件

| 日期 | payload | 生成结果 | 原始 response |
|---|---|---|---|
| 2026-06-01 | `docs/ai-day-journey/test-payloads/2026-06-01-day-journey-payload.json` | `docs/ai-day-journey/test-results/2026-06-01-generated-day-journey-v1.md` | `docs/ai-day-journey/test-results/2026-06-01-day-journey-response-v1.json` |
| 2026-06-02 | `docs/ai-day-journey/test-payloads/2026-06-02-day-journey-payload.json` | `docs/ai-day-journey/test-results/2026-06-02-generated-day-journey-v1.md` | `docs/ai-day-journey/test-results/2026-06-02-day-journey-response-v1.json` |

### 7.2 对比总览

| 日期 | Golden 文件 | 当前生成结果 | 主要差异 | Badcase 类型 | 修复方向 |
|---|---|---|---|---|---|
| 2026-06-01 | `examples/2026年6月1日原始日历与一天之旅.md` | GLM v1 | 关键词过泛、11:30 后分段不贴近 Golden、阶段归纳过粗、一天回顾偏短 | 关键词粒度不足 / 分段偏差 / 事实遗漏 / 过度压缩 | 强化复盘日关键词、午饭后分段、`◆` 归纳和回顾事实覆盖 |
| 2026-06-02 | `examples/2026年6月2日原始日历与一天之旅.md` | GLM v1 | 缺少「一天回顾」、关键词遗漏、阶段归纳过粗、把“帮老爸弄照片”写成“老爸生日” | 必要结构缺失 / 事实改写 / 事实遗漏 / 过度压缩 | 增加强制结构重试、强化不得跨样例迁移事实、强化项目开发日关键词 |

### 7.3 2026-06-01 对比结论

结果：未通过 Golden 对比。

已满足：

- 标题日期正确。
- 必要结构都存在。
- 三段加粗 `◆` 存在。
- 输出时间点均来自 payload 中的 `displayStartTime`，未发现时间漂移。
- 未发现明显虚构事件。

主要问题：

- 关键词生成过泛：`阅读、复盘、日常、营养补剂、图书馆` 没有覆盖 Golden 的 `周复盘、月度复盘、6 月规划、历史复盘整理、Learn Claude Code`。
- 11:30 午饭和 12:00 月度复盘被放入早上；Golden 从 11:30 午饭开始进入下午。
- 阶段归纳只写 `阅读和复盘`、`复盘和日常`、`复盘、日常和图书馆`，没有保留具体事项。
- 一天回顾偏短，遗漏黑芝麻粉、亚麻籽粉、刷牙洗漱、5 月份复盘语音输入、1-3 月份回顾、中途 7 分钟吃饭、2024/2025 文档合并等关键事实。

### 7.4 2026-06-02 对比结论

结果：未通过 Golden 对比。

已满足：

- 标题日期正确。
- 早上、下午、晚上三段存在。
- 三段加粗 `◆` 存在。
- 输出时间点均来自 payload 中的 `displayStartTime`，未发现时间漂移。

主要问题：

- 输出缺少 `### 一天回顾`，没有 ☀️ / 🌇 / 🌃 三段第一人称。
- 关键词漏掉 `Learn Claude Code`、`6 月规划`、`Agent 专项归档`、`Trae` 等 Golden 主线。
- 阶段归纳偏泛，晚上写成 `日常活动、健身、美食、社交`，没有保留羊肉串、健身到 8:40、野人先生冰淇淋、走路回家、装三重镁、聊天。
- 早上归纳把“帮老爸弄照片”写成“老爸生日”，属于跨样例事实迁移或事实改写。

### 7.5 本轮判断

- `displayStartTime` 机制有效：6.1 / 6.2 没有出现时间点漂移。
- V1.2 对已注入 Golden Reference 的 6.3 / 6.4 有效，但对未注入的 6.1 / 6.2 泛化不足。
- 下一步建议继续做 V1.3 Prompt / 输入构造迭代，再决定是否进入复制、下载、保存等功能。

## 8. V1.3 修复后对比结果

### 8.1 2026-06-01

输出文件：

```text
docs/ai-day-journey/test-results/2026-06-01-generated-day-journey-v2.md
```

修复结果：

- promptVersion：`day-journey-system-prompt-v1.3`
- warnings：`[]`
- 已使用 Golden Reference。

已修复：

- 关键词过泛已修复：关键词覆盖 `阅读、周复盘、月度复盘、6 月规划、历史复盘整理、Learn Claude Code`。
- 午饭后分段已修复：`11:30` 午饭开始进入下午。
- 阶段归纳过粗已修复：下午 `◆` 覆盖午饭、5 月份月度复盘、6 月份规划、营养补剂讨论、4 月复盘电子化、5 月复盘语音输入和 1-3 月份回顾。
- 一天回顾事实遗漏已修复：三段回顾覆盖阅读、周复盘、粉类补充、历史复盘、文档合并、图书馆、AI 对话和 Learn Claude Code。

结论：通过 Golden 对比。

### 8.2 2026-06-02

输出文件：

```text
docs/ai-day-journey/test-results/2026-06-02-generated-day-journey-v2.md
```

修复结果：

- promptVersion：`day-journey-system-prompt-v1.3`
- warnings：`[]`
- 已使用 Golden Reference。

已修复：

- `### 一天回顾` 缺失已修复。
- 关键词遗漏已修复：关键词覆盖 `Learn Claude Code、6 月规划、Agent 专项归档、时间管理项目、Supabase、Trae、CodeX、AI PRD、浏览器插件`。
- 事实改写已修复：`帮老爸弄照片` 没有被写成 `老爸生日`。
- 晚上归纳过粗已修复：覆盖 AI PRD、浏览器插件、羊肉串、健身、野人先生冰淇淋、走路回家、装三重镁和聊天。

结论：通过 Golden 对比。
