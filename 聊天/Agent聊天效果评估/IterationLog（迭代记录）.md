# IterationLog（迭代记录）

IterationLog 记录每轮“发现 Badcase -> 修改策略 -> 复测结果”的闭环。它是作品集里最能体现产品迭代能力的证据。

## Iteration 001：V1.1 自然对话优化

时间：2026-07-19

### 触发原因

用户反馈 Agent 回答太像报告，不像 DeepSeek 那种自然聊天。

### 发现的 Badcase

- 回答开头太机械。
- 普通计划问题也使用“上下文事实 / 统计趋势 / 推断”这类报告标题。
- 建议可执行，但缺少自然承接。
- 日常对话容易被强行转成效率建议。
- 输出曾出现 Markdown 符号。

### 修复策略

- 将 Agent 人设改成“个人时间伙伴”。
- 增加“自然聊天”的明确要求。
- 按今日安排、复盘分析、情绪压力、行动草案四类定义回答策略。
- 保留不编造、不越权、不输出 Markdown 的边界。
- 调整快捷问题为更自然的表达。

### 影响文件

- `server/llmChat.ts`
- `components/Chat.tsx`
- `tests/test-chat-plain-text-prompt.ts`
- `聊天/Agent聊天效果评估/GoldenSet（金标集）.md`
- `聊天/Agent聊天效果评估/ConversationFlows（多轮对话流程）.md`
- `聊天/Agent聊天效果评估/Badcase（坏案例）.md`
- `聊天/Agent聊天效果评估/ToneRubric（语气评分标准）.md`

### 复测计划

- 跑 40 条 GoldenSet。
- 跑 8 组多轮流程。
- 使用 synthetic 上下文生成公开评估记录。
- 用 Badcase 标签标记仍存在的问题。

### 复测命令

```bash
npx tsx 'tests/test-agent-golden-rules（测试Agent金标规则）.ts'
npx tsx 'scripts/run-agent-golden-set（运行Agent金标集评估）.ts' --mode synthetic --mock
npx tsx tests/test-chat-plain-text-prompt.ts
npx tsx tests/test-deepseek-chat-mode.ts
npm run build
```

### 复测结果

结构规则、prompt 规则、mock synthetic 评估和 build 结果由本轮执行后更新到 `EvaluationLog.synthetic.latest（合成上下文最新评估）.md`。如果真实 LLM 输出出现新 Badcase，需要追加到 `Badcase（坏案例）.md` 并进入下一轮 Iteration。

### 剩余问题

- 多轮流程当前先记录评估样本和流程骨架，真实多轮回放可在下一轮接入会话历史。
- real 模式仅支持前端手动导出上下文，不直接读取 Supabase。
- 当前 LLM judge 对 real 模式默认关闭，避免真实日记或日程被发送给评审模型。

### 下一轮计划

- 接入真实多轮会话回放，记录每一轮 Actual Output。
- 将高频 Badcase 反向生成更小的 prompt 回归样本。
- 如果后续做聊天记录持久化，再评估长期上下文连续性。

## Iteration 002：真实 LLM 输出评估

时间：2026-07-19

### 触发原因

Iteration 001 只完成了 mock synthetic 验证，还不能证明当前 Agent 的真实输出质量。用户要求补齐真实 LLM 的 40 条 Actual Output、多轮回放、real 私有评估尝试，并把真实 Badcase 回写到文档。

### 发现的 Badcase

- 单轮真实 synthetic 评估：40 条样本，平均分 11.3 / 25，硬失败数 32，结论 Fail。
- 多轮真实 synthetic 回放：8 组流程、36 轮，规则平均分 24.5 / 25，硬失败数 2，结论 Fail。
- 高频问题一：泛化问题被背景日程抢答，Agent 容易直接套用 synthetic 日程和日记，而不是先判断用户是否要求基于记录。
- 高频问题二：长上下文和作品集复盘类多轮任务中仍可能输出 Markdown 符号。
- 评估体系问题：部分 GoldenSet 样本假设“无上下文”，但 synthetic 运行时实际传入了完整上下文，导致金标口径和真实输入不完全一致。

### 修复策略

- 不把真实评估失败隐藏为 mock Pass，而是保留 Fail 结果作为下一轮迭代起点。
- 将“上下文抢答”和“评估口径冲突”新增为 Badcase 类型。
- 修复评估脚本参数解析，让 `--mode real` 和 `--mode=real` 都能正确识别。
- 给真实 LLM 调用增加重试，避免偶发空响应中断全量评估。
- 将多轮流程从“骨架记录”升级为真实逐轮 Actual Output 回放。

### 影响文件

- `scripts/run-agent-golden-set（运行Agent金标集评估）.ts`
- `聊天/Agent聊天效果评估/EvaluationLog.synthetic.latest（合成上下文最新评估）.md`
- `聊天/Agent聊天效果评估/EvaluationLog.flows.synthetic.latest（多轮流程最新评估）.md`
- `聊天/Agent聊天效果评估/Badcase（坏案例）.md`
- `聊天/Agent聊天效果评估/IterationLog（迭代记录）.md`

### 复测命令

```bash
npx tsx 'scripts/run-agent-golden-set（运行Agent金标集评估）.ts' --mode synthetic --retries=2
npx tsx 'scripts/run-agent-golden-set（运行Agent金标集评估）.ts' --mode real --smoke --retries=1
```

### 复测结果

synthetic 真实 LLM 全量评估已完成，并生成公开证据：

- 单轮：`EvaluationLog.synthetic.latest（合成上下文最新评估）.md`
- 多轮：`EvaluationLog.flows.synthetic.latest（多轮流程最新评估）.md`
- 时间戳归档：`runs/synthetic/2026-07-19T06-43-49-965Z.md`

real 私有评估已尝试运行，但缺少手动导出的真实上下文文件：

```text
聊天/Agent聊天效果评估/private/clientContext.real.local（真实上下文本地导出）.json
```

因此 real 模式当前无法完成真实评估。脚本边界是正确的：它不会直接读取 Supabase，也不会绕过前端导出流程。

### 下一轮计划

- 由前端手动导出 real `clientContext` 后，运行 real 私有评估。
- 拆分 GoldenSet 的 `withContext` 和 `withoutContext` 评估口径。
- 修改 prompt 的上下文意图门控，避免泛化问题被背景日程抢答。
- 对多轮 Markdown 符号增加更强的输出约束或展示前清理。

## Iteration 记录模板

### Iteration XXX：标题

时间：

触发原因：

发现的 Badcase：

采取的修改：

影响文件：

复测命令：

复测结果：

下一轮计划：
