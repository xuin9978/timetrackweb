# AI 自动复盘 Prompt 版本记录

## 1. 记录原则

每次修改 Prompt、AI 输出结构、LLM 调用方式、错误兜底、数据聚合逻辑时，都需要在本文追加记录。

## 2. 当前 Prompt

### Prompt-V0

```text
你是一个时间管理复盘助手。

请只根据输入 JSON 中的事件、标签和统计数据生成日复盘。
不要编造不存在的事件、标签、目标、情绪、完成状态或用户偏好。
如果数据不足，请明确说明数据不足，并给出轻量建议。

输出必须包含：
1. 今日概览
2. 时间分配
3. 关键观察
4. 可能问题
5. 明日建议
6. 数据依据

输入 JSON：
{{review_input_json}}
```

## 3. 版本记录表

| 日期 | Prompt 版本 | 变更类型 | 变更内容 | 变更原因 | 影响范围 | 验证方式 | 关联 Badcase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-06-05 | Prompt-V0 | 初始化 | 创建 AI 自动复盘 Prompt 骨架 | 支持 V0 PRD 和 Workflow | 日复盘生成 | 未验证 | - |
| 2026-06-05 | Prompt-V1 | 输出约束调整 | 本地 LLM 调用 Prompt 要求只基于 events/tags/stats 输出，并固定返回 JSON 字段：summary、time_distribution、insights、risks、actions、caveats | 前端弹窗需要稳定结构化渲染，并支持 Eval / Badcase 归因 | AI 日复盘弹窗、本地 `/api/ai/daily-review` 接口 | `npm run build` 通过，未完成真实 LLM 输出验收 | - |
| 2026-06-05 | Prompt-V2 | 系统提示词产品化 | 将系统提示词升级为“克制、可靠的个人时间管理复盘助手”，补充事实优先、表达克制、输出具体、结构稳定四类约束 | 让 AI 日复盘更适合作为 AI PM 作品集证据，便于讲清 Workflow、Eval 和 Badcase 闭环 | 本地 `/api/ai/daily-review` 接口、AI 日复盘弹窗 | `npm run build` 通过，未完成真实 LLM 多样本验收 | - |

## 4. 输出结构版本

| 日期 | 输出结构版本 | 结构说明 | 变更原因 | 验证方式 |
| --- | --- | --- | --- | --- |
| 2026-06-05 | Output-V0 | Markdown 六段式结构 | 便于首版展示和人工评估 | 未验证 |
| 2026-06-05 | Output-V1 | JSON 结构，包含 summary、time_distribution、insights、risks、actions、caveats | 便于前端结构化展示、字段校验、Eval 打分和 Badcase 归因 | `npm run build` 通过，未完成真实 LLM 输出验收 |
| 2026-06-05 | Output-V2 | JSON 结构，包含 summary、time_distribution、evidence_based_observations、risks、tomorrow_actions、data_limitations | 字段命名更贴近产品评估目标，强调证据、明日行动和数据限制 | `npm run build` 通过，前端兼容 V1/V2 字段，未完成真实 LLM 多样本验收 |

## 5. LLM 调用方式记录

| 日期 | 调用版本 | 模型/服务 | 输入格式 | 输出格式 | 错误兜底 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-06-05 | Call-V0 | 待定 | JSON | Markdown | 待实现 | 当前仅为文档模板 |
| 2026-06-05 | Call-V1 | GLM 优先，DeepSeek 兜底 | 前端聚合后的 JSON，包含 date_range、events、stats | JSON | 真实调用失败时展示本地 Demo 复盘 | 通过 Vite dev server middleware `/api/ai/daily-review` 调用，本地 Demo 用；API Key 只从服务端环境变量读取 |
| 2026-06-05 | Call-V2 | GLM 优先，DeepSeek 兜底 | 前端聚合后的 JSON，包含 date_range、events、stats | Output-V2 JSON，前端兼容 Output-V1 字段 | 真实调用失败时展示本地 Demo 复盘，空结构返回视为失败 | 系统提示词升级为 Prompt-V2，继续通过 Vite dev server middleware 本地调用 |

## 6. 数据聚合逻辑记录

| 日期 | 聚合版本 | 变更内容 | 影响字段 | 验证方式 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 2026-06-05 | Aggregation-V0 | 建立聚合字段清单，尚未实现 | totalDurationMinutes、durationByTag、timeline、gaps | 未验证 | 见 Workflow 文档 |
| 2026-06-05 | Aggregation-V1 | 前端弹窗基于当前面板 events/tags 计算总时长、事件数、标签分布、主要标签、短事件、晚间记录 | total_duration_minutes、event_count、duration_by_tag、time_distribution、risk、actions | `npm run build` 通过，未完成真实样本验收 | 当前基于右侧面板已加载数据，不代表全量历史 |
