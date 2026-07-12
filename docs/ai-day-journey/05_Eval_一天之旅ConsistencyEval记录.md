# 一天之旅 Consistency Eval 记录

## 0. 文件定位

本文件用于记录「一天之旅」同一日期多次生成的一致性测试结果。

Consistency Eval 不要求每次逐字完全一致，但要求同一日期多次生成时稳定满足同一套 Rubric：结构、事实覆盖、关键词、早中晚分段、阶段归纳、段落组织和一天回顾风格不能明显漂移。

## 1. 本轮测试信息

| 项目 | 内容 |
|---|---|
| 测试日期 | 2026-06-05 |
| 测试 payload | `docs/ai-day-journey/test-payloads/2026-06-05-day-journey-payload.json` |
| 调用接口 | `POST /api/ai/day-journey` |
| provider | `glm` |
| model | `glm-4-flash` |
| promptVersion | `day-journey-system-prompt-v1.5` |
| 当前 temperature | `0.2` |
| 生成次数 | 3 |

说明：Golden md 只作为格式、风格、段落组织和 Eval 标准参考。2026-06-05 的事实来源只能是 2026-06-05 payload。

## 2. 输出文件

| Run | Response JSON | Markdown |
|---|---|---|
| 1 | `docs/ai-day-journey/test-results/2026-06-05-day-journey-response-run-1.json` | `docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-run-1.md` |
| 2 | `docs/ai-day-journey/test-results/2026-06-05-day-journey-response-run-2.json` | `docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-run-2.md` |
| 3 | `docs/ai-day-journey/test-results/2026-06-05-day-journey-response-run-3.json` | `docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-run-3.md` |

## 3. 一致性评估表

| 日期 | Run | 输出文件 | 是否通过 | 主要差异 | 是否有事实遗漏 | 是否有事实污染 | 是否段落过碎 | 是否建议纳入 Badcase |
| -- | --- | ---- | ---- | ---- | ------- | ------- | ------ | -------------- |
| 2026-06-05 | 1 | `2026-06-05-generated-day-journey-consistency-run-1.md` | 部分通过 | 结构完整、段落合并稳定；但关键词和早上 `◆` 仍偏 6 月 4 日范本，如出现“客观评判标准” | 轻微，阶段归纳未充分覆盖 6.5 真实事项 | 有，`客观评判标准` 不属于 6.5 payload | 否 | 是 |
| 2026-06-05 | 2 | `2026-06-05-generated-day-journey-consistency-run-2.md` | 不通过 | 一天回顾明显混入 6 月 4 日最终范本事实，如 yyw、东方树叶、《人工智能白皮书》、客观评判标准、最佳实践原则 | 有，回顾未覆盖 6.5 下午和晚上主要事实 | 有，Golden 范本事实污染明显 | 否 | 是 |
| 2026-06-05 | 3 | `2026-06-05-generated-day-journey-consistency-run-3.md` | 部分通过 | 结构完整、事实覆盖较好、段落组织稳定；但 `🌇：下午我` / `🌃：晚上我` 触发回顾格式 warning，且早上 `◆` 仍有外来事实 | 轻微 | 有，`客观评判标准` 不属于 6.5 payload | 否 | 是 |

## 4. 维度检查

### 4.1 结构一致性

三次均包含：

- `## 2026 年 6 月 5 日`
- `**关键词：`
- `### ☀️早上`
- `### 🌇下午`
- `### 🌃晚上`
- `### 一天回顾`
- 三个时段的 `◆` 阶段归纳

结论：结构层稳定。

### 4.2 事实覆盖一致性

稳定覆盖的事实：

- 泡咖啡、罗森、深蹲俯卧撑、Rethink、黑芝麻亚麻籽粉、煮鸡蛋。
- B 站、ChatGPT、AI PRD、Claude、老爸转账。
- 时间管理项目、AI 复盘、AI 功能和看板、系统提示词、一天之旅、看板视图、组件按钮。
- 锻炼、吃饭、到家 9 点、休息、看手机。

不稳定问题：

- Run 2 的一天回顾大量混入 6 月 4 日最终范本事实。
- Run 1 / Run 3 的早上 `◆` 出现“客观评判标准”等 6.5 payload 中没有的事实。

结论：事实覆盖不够稳定，主要问题是 Golden Reference 事实污染。

### 4.3 时间和分段一致性

- 三次正文时间点均来自原始事件，例如 `7:45`、`9:30`、`10:15`、`11:00`、`12:38`、`12:55`、`13:26`、`14:00`、`14:43`、`15:31`、`15:46`、`17:26`。
- 三次早上 / 下午 / 晚上标题均存在。
- 但 `12:00` 吃饭被放在早上正文中，是否符合产品期望需要后续确认；按现有 Golden 规则，午饭及午饭后通常进入下午。

结论：时间点稳定，分段整体稳定，但午饭边界仍可继续观察。

### 4.4 段落组织一致性

- Run 1：早上 1 个正文段、下午 1 个正文段、晚上 1 个正文段。
- Run 2：早上 1 个正文段、下午 1 个正文段、晚上 1 个正文段。
- Run 3：早上 1 个正文段、下午 1 个正文段、晚上 1 个正文段。
- 三次均保留两个中文全角空格缩进。

结论：V1.5 已稳定修复“一条 event 一个段落”的问题。

### 4.5 关键词稳定性

三次关键词完全一致：

```text
时间管理项目、AI PRD、学习方法论、GPT 工具、轻工程基础。
```

问题：

- 关键词过度贴近 6 月 4 日最终范本。
- 对 6 月 5 日来说，`学习方法论`、`GPT 工具`、`轻工程基础` 未必是当天最准确主线。
- 更适合 6.5 的关键词可能应覆盖：`AI 功能优化`、`系统提示词迭代`、`一天之旅`、`时间管理项目`、`日常活动`、`锻炼`。

结论：关键词表面稳定，但稳定到了错误抽象层级，存在 Golden 关键词迁移风险。

### 4.6 一天回顾稳定性

- Run 1：三段第一人称结构通过，但内容偏机械复述正文。
- Run 2：三段结构存在，但内容严重污染，混入 6 月 4 日事实。
- Run 3：事实覆盖较好，但格式为 `🌇：下午我` / `🌃：晚上我`，触发结构 warning。

结论：一天回顾是当前最不稳定模块。

### 4.7 Golden 风格接近度

- Run 1：段落组织稳定，但早上 `◆` 有外来事实，回顾偏机械。
- Run 2：问题最大，不符合 Golden Set 的事实边界要求。
- Run 3：相对最接近可用状态，事实覆盖和叙述完整度较好，但仍有轻微格式 warning。

## 5. 当前结论

当前 2026-06-05 多次生成不够稳定。

已经稳定的部分：

- Markdown 结构。
- 早中晚标题。
- 三个 `◆` 阶段归纳。
- 段落组织。
- 两个中文全角空格缩进。

不稳定的部分：

- Golden Reference 事实污染。
- 一天回顾事实边界。
- 关键词抽象层级。
- 一天回顾格式细节。

最接近 Golden 风格的一版：

- Run 3。

问题最大的一版：

- Run 2。

主要漂移点：

- 模型把 Golden md 当成事实来源，而不是只学习结构和风格。
- 6 月 4 日最终范本的关键词、阶段归纳和回顾事实会迁移到 6 月 5 日。

## 6. 参数与修复建议

当前 `/api/ai/day-journey` 的 LLM 参数：

- `temperature: 0.2`
- `maxTokens: 4096`
- provider fallback：GLM 优先，DeepSeek 兜底

判断：

- `temperature` 已经偏低，符合记录型生成的稳定需求。
- 仍出现明显漂移，说明首要问题不是温度过高，而是 Golden Reference 的注入方式容易让模型复制事实。

建议优先级：

1. 优先修改输入构造：不要把 Golden md 原文完整注入当前生成上下文；改为注入“风格 Rubric / 段落结构规则 / 禁止复制样例事实”的精简版参考。
2. 在 user message 中更强约束：`Golden Reference 只能学习格式和风格，严禁复制其中任何具体事实到当前日期。`
3. 增加输出后校验：如果生成结果出现当前 payload 不存在的人名、地点、工具或主题，写入 warnings，必要时触发重试。
4. 可选调整 temperature 到 `0.1` 或 `0`，但这只能降低随机性，不能根治事实污染。

## 7. 是否需要继续 V1.5 稳定性修复

建议继续。

原因：

- 当前段落组织已经稳定，但事实边界和一天回顾仍不稳定。
- 这是 AI 日复盘类产品的关键质量问题：同一天多次生成不能一次可用、一次污染。
- 下一步建议做 V1.6：Golden Reference 去事实化 + 当前 payload 事实白名单校验。

## 8. V1.6 修复后 Consistency Eval：2026-06-05

本轮目标：修复 Golden Reference 事实污染和同日期多次生成漂移。

V1.6 关键改动：

- 不再把 6 月 1 日到 6 月 4 日完整 Golden md 原文注入模型生成上下文。
- 生成上下文改为不含具体事实的 `style_guide_from_golden_set_non_factual`。
- 新增 `current_day_fact_whitelist`，当天事实只能来自当前 payload。
- 增加外来事实 warning 检查。
- `temperature` 从 `0.2` 调整为 `0.1`。
- 增加轻量后处理：同一时段内连续时间点段落自动合并为自然段；`🌇：下午我` / `🌃：晚上我` 规范为 `🌇：我下午` / `🌃：我晚上`。

测试文件：

```text
docs/ai-day-journey/test-results/2026-06-05-day-journey-response-v16-run-1.json
docs/ai-day-journey/test-results/2026-06-05-day-journey-response-v16-run-2.json
docs/ai-day-journey/test-results/2026-06-05-day-journey-response-v16-run-3.json
docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-v16-run-1.md
docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-v16-run-2.md
docs/ai-day-journey/test-results/2026-06-05-generated-day-journey-consistency-v16-run-3.md
```

| 日期 | Run | 输出文件 | 是否通过 | 主要差异 | 是否有事实遗漏 | 是否有事实污染 | 是否段落过碎 | 是否建议纳入 Badcase |
| -- | --- | ---- | ---- | ---- | ------- | ------- | ------ | -------------- |
| 2026-06-05 | Run 1 | `2026-06-05-generated-day-journey-consistency-v16-run-1.md` | 基本通过 | 一天回顾略短 | 轻微 | 无 | 无 | 否 |
| 2026-06-05 | Run 2 | `2026-06-05-generated-day-journey-consistency-v16-run-2.md` | 基本通过 | 一天回顾更完整，但关键词略有差异 | 轻微 | 无 | 无 | 否 |
| 2026-06-05 | Run 3 | `2026-06-05-generated-day-journey-consistency-v16-run-3.md` | 通过 | warnings 为空，事实覆盖较完整 | 无明显遗漏 | 无 | 无 | 否 |

### V1.6 结论

- 三次生成均未再出现 `yyw`、`东方树叶`、`《人工智能白皮书》`、`客观评判标准`、`最佳实践原则` 等 6.1-6.4 外来事实污染。
- 三次结构稳定，均包含日期标题、关键词、早上、下午、晚上、一天回顾和三个 `◆` 阶段归纳。
- 三次段落组织稳定，早上 / 下午 / 晚上正文均合并为自然段，不再一条 event 一个段落。
- Run 3 最接近当前 V1.6 目标，warnings 为空。
- Run 1 / Run 2 仍有“一天回顾偏短”的轻微提示，但不再是事实污染类问题。

当前建议：

- V1.6 已解决最关键的 Golden Reference 事实污染问题。
- 后续如继续追求质量，可进入 V1.7：增强一天回顾信息密度评分或轻量重试。
- 若产品优先级转向可用性，可以进入保存功能验收和前端交互验收。
