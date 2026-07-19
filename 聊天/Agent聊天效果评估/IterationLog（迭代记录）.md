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
