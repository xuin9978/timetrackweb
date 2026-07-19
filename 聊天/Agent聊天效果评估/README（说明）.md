# Agent 聊天效果评估说明

这套评估机制用于记录 TimeTrack 个人时间 Agent 从“能回答”走向“好体验”的迭代过程。它不是临时测试清单，而是一套偏作品集叙事、同时具备工程回归能力的 Agent 体验评估与迭代机制。

核心问题是：用户反馈 Agent 的回答虽然能使用日历和日记上下文，但语气不够自然，容易像时间管理报告。V1.1 的目标是让它更像一个熟悉用户节奏的个人时间伙伴，同时保留可信边界：不编造、不越权、不输出 Markdown、不假装读取缺失数据。

## 机制组成

- `PortfolioNarrative（作品集叙事）.md`：记录项目背景、方法和作品集表达。
- `GoldenSet（金标集）.md`：40 条单轮评估样本，每条包含 Golden Criteria 和 Golden Answer。
- `ConversationFlows（多轮对话流程）.md`：8 组多轮流程，用于评估上下文连续性、语气连续性和任务推进能力。
- `ToneRubric（语气评分标准）.md`：人工评估和 LLM judge 共用的评分口径。
- `Badcase（坏案例）.md`：记录失败模式、原因、修复状态和复测结果。
- `Baseline（基线记录）.md`：记录优化前后的基线表现。
- `IterationLog（迭代记录）.md`：记录 Badcase 到修复再到复测的闭环。
- `PromptChangeLog（提示词变更记录）.md`：记录 prompt 修改原因、内容和副作用。
- `PrivacyPolicy（隐私边界）.md`：定义 synthetic 与 real 评估的数据边界。
- `EvaluationLog.synthetic.latest（合成上下文最新评估）.md`：公开可提交的最新合成上下文评估结果。

## Eight Modules（8 个机制模块）

| 模块 | 输入 | 输出 | 公开性 | 证据文件 |
| --- | --- | --- | --- | --- |
| Baseline（基线记录） | 优化前体验、用户反馈、代表性问题 | 优化前问题画像和对比基线 | 可公开，使用脱敏或 synthetic 示例 | `Baseline（基线记录）.md` |
| Version Compare（版本对比） | V1、V1.1 的 prompt 和输出 | 版本差异、改善点、副作用 | 可公开 | `PromptChangeLog（提示词变更记录）.md`、`EvaluationLog.synthetic.latest（合成上下文最新评估）.md` |
| Pass Fail Threshold（通过阈值） | 规则评分、LLM judge、人工评分 | Pass / Fail 结论 | 可公开 | `ToneRubric（语气评分标准）.md` |
| Badcase Taxonomy（坏案例分类） | Actual Output、失败标签 | 可追踪的失败类型和修复状态 | synthetic 可公开，real 需脱敏 | `Badcase（坏案例）.md` |
| Fix Action Type（修复动作类型） | Badcase 原因 | Prompt、上下文、UI、测试、产品边界修复动作 | 可公开 | `Badcase（坏案例）.md`、`IterationLog（迭代记录）.md` |
| Human Review Rubric（人工评估标准） | Agent 输出和 Golden Answer | 1 到 5 分人工评分口径 | 可公开 | `ToneRubric（语气评分标准）.md` |
| Privacy Boundary（隐私边界） | synthetic / real 上下文和输出 | 可提交、不可提交、需脱敏的边界 | 可公开，不含真实数据 | `PrivacyPolicy（隐私边界）.md` |
| Prompt Change Record（提示词变更记录） | prompt diff、验证命令、复测结果 | 迭代原因、改动、结果、风险 | 可公开 | `PromptChangeLog（提示词变更记录）.md` |

这 8 个模块共同组成作品集证据链：先说明优化前问题，再定义理想体验，再跑评估，再把 Badcase 回流到下一轮 prompt 或产品设计。

## 默认评估策略

一、单轮评估覆盖 4 类场景，每类 10 条：时间规划、状态复盘、行动草案、日常对话。

二、多轮评估覆盖 8 组流程，每类 2 组，每组 3 到 5 轮。

三、synthetic 模式使用合成上下文，适合公开展示和作品集留痕。

四、real 模式读取前端手动导出的真实 `clientContext`，输出默认写入 `private`，不提交 Git。

五、规则评分检查硬伤，LLM judge 评估自然度、上下文准确性、边界感、可执行性和陪伴感。

## 推荐命令

```bash
npx tsx 'tests/test-agent-golden-rules（测试Agent金标规则）.ts'
npx tsx 'scripts/run-agent-golden-set（运行Agent金标集评估）.ts' --mode synthetic --mock
```

real 模式如需启用 LLM judge，必须显式传入：

```bash
npx tsx 'scripts/run-agent-golden-set（运行Agent金标集评估）.ts' --mode real --allow-real-judge
```
